---
title: Evading eBPF-Based EDRs
created: 2026-10-31 00:01
domains:
  - Operating Systems Internals
  - Ethical Hacking & Penetration Testing
---

# Evading eBPF-Based EDRs

In the months leading up to my graduation, a professor introduced me to an evasive cat-and-mouse game between threat actors and Endpoint Detection & Response systems. At the heart of this game was the [[Extended Berkeley Packet Filter (eBPF)]] - a framework to modify a kernel's behavior without recompiling it.

Intriguing.

In 1993, the [[Linux Kernel]] added the Berkeley Packet Filter to help filter and control network traffic. In the 30 years since, BPF effectively went Super Saiyan and added so many features that we now call it the "extended" Berkeley Packet Filter. These newer features can be used for networking, security, monitoring, and a lot more.

eBPF provides a programmable network of hooks, sensors, and filters directly inside the kernel. Whatever program you write takes advantage of these preexisting hooks, letting you collect telemetry and trigger actions based on chosen system events.

We ended up investigating host-level [[System Call]] tracing in cloud-native environments, exploring how machine learning classifiers could detect malicious container behavior from kernel telemetry. That work culminated in an [ACM research paper](/publications#acm-aiccc-2024) and an open-source hypervisor-level monitor called [`sysmonitor-ebpf`](/projects#sysmonitor-ebpf). By operating safely inside the kernel, our monitor captured namespace-aware telemetry across containers without the crushing overhead of legacy auditing tools, feeding clean behavioral data into anomaly detection models. Even simple classifiers yielded strong results, proving firsthand just how transformative eBPF is for defenders.

In early 2025, however, I found myself revisiting eBPF from the opposite side of the table.

Over the past few years, eBPF has emerged as the gold standard for enterprise Linux security. Modern EDR platforms - from commercial agents to open-source tooling like [Tetragon](https://github.com/cilium/tetragon) and [Tracee](https://github.com/aquasecurity/tracee) - frequently position eBPF as an impenetrable panacea for runtime security. In March 2025, I was invited to speak at the Red Team Summit hosted by Microsoft, where I gave a presentation titled *"[eBPF & AI-Powered EDRs: Can Red Teams Still Win?](/involvements#speaking)"*

The short answer? **Yes, absolutely.**

In security, no technology is ever a silver bullet. While eBPF provides unprecedented visibility, viewing it as an infallible shield overlooks how systems actually behave under adversarial pressure. When we analyze eBPF's architecture from first principles, we uncover a foundational reality: **eBPF was engineered as an asynchronous observability framework, not a synchronous security barrier.**

Let's dissect why defenders fell in love with eBPF, where the armor cracks, and how an informed adversary can systematically blind, race, and subvert eBPF-based EDRs.

## The Defender's Dilemma (Why eBPF Won)

To understand how to evade an eBPF sensor, we first have to appreciate the engineering nightmare it was built to solve. Historically, if you wanted deep runtime visibility into a Linux endpoint, you had two rather painful choices:

1. **The Userspace Slog (`auditd`):** The Linux Audit subsystem hooks into system calls, but it imposes a staggering performance penalty on production servers. Under high-throughput workloads, `auditd` either bottlenecks system I/O or panics and drops logs indiscriminately.
2. **The Danger Zone ([[Loadable Kernel Modules (LKMs)]]):** Writing custom kernel modules gave defenders ultimate power, but at a significant operational cost. A single null pointer dereference or memory leak in your security sensor would kernel-panic an entire fleet of production servers. Furthermore, modern hardware protections like [[Unified Extensible Firmware Interface (UEFI)]] [[Secure Boot]] and kernel module signing make deploying third-party LKMs an administrative headache.

eBPF solved both dilemmas by providing a sandboxed, JIT-compiled execution environment inside the kernel. Developers write high-level C programs, compile them into bytecode, and load them via the `bpf()` system call.

Before a single instruction executes, the **[eBPF Verifier](https://docs.kernel.org/bpf/verifier.html)** statically analyzes the bytecode to guarantee safety:
- It verifies that the program cannot execute unbounded loops (ensuring it always terminates).
- It enforces strict memory boundary checks to prevent out-of-bounds reads or writes.
- It ensures the program can never crash, hang, or deadlock the kernel.

Once verified, the bytecode hooks into `tracepoints`, `kprobes`, or network sockets, delivering sub-microsecond visibility with zero risk of crashing production.

So, where does the armor crack?

## The Blind Spots

Echoing Jann Horn's famous post, "[Mitigations are attack surface, too](https://projectzero.google/2020/02/mitigations-are-attack-surface-too.html)", the exact safety guarantees that the eBPF Verifier enforces to protect production stability become blind spots when an attacker pushes the system to its limits.

### 1. The Asynchronous Dilemma: Observability is Not Enforcement

Most eBPF security sensors do not block execution synchronously; they stream telemetry asynchronously to a userspace daemon.

When an eBPF probe captures an event in kernel space, it writes that data into a shared memory ring buffer (`bpf_ringbuf` or `perf_event_output`). A userspace agent drains this buffer, reconstructs the process tree, and evaluates detection rules to decide if the activity is malicious.

This decoupling creates an inherent architectural bottleneck: **Event Overload and Buffer Saturation**.

eBPF ring buffers have a finite memory allocation. If we flood the operating system with an avalanche of rapid, high-frequency dummy system calls - such as tens of thousands of harmless `openat` or `stat` calls across parallel threads - the ring buffer saturates faster than the userspace agent can drain it.

Remember the eBPF Verifier's core rule: an eBPF program cannot stall or freeze the kernel to wait for userspace to catch up. When an eBPF buffer overflows, the kernel prioritizes system stability and drops the telemetry:

```c
// Simplified kernel eBPF probe snippet
int trace_sys_enter(struct trace_event_raw_sys_enter *ctx) {
    struct event_t *event = bpf_ringbuf_reserve(&events, sizeof(*event), 0);
    if (!event) {
        // BUFFER IS FULL: The event is silently dropped!
        return 0;
    }
    // Populate event telemetry...
    bpf_ringbuf_submit(event, 0);
    return 0;
}
```

By orchestrating a localized syscall flood, an attacker forces the sensor into a state of loss. A malicious action executed right in the middle of that noise has its corresponding telemetry silently discarded by the kernel before the EDR ever sees it.

### 2. The Silent Page Fault Trap

Flooding the ring buffer is loud - it's a blunt-force denial of service against the telemetry pipeline. What if we want surgical invisibility without generating a single extra system call?

To prevent kernel deadlocks, **standard eBPF tracing programs are not allowed to sleep**.

When an eBPF sensor wants to inspect userspace memory - such as reading the file path passed to `execve` or examining command-line arguments - it must invoke the `bpf_probe_read_user()` helper.

Now, consider what happens if that userspace memory page is not currently resident in physical [[Random Access Memory (RAM)]], or has been paged out. During normal execution, touching an unmapped page triggers a hardware **page fault**. The kernel puts the thread to sleep, pages the data into memory, updates the page tables, and resumes execution.

Because an eBPF probe runs in a non-sleepable context, it **cannot service a page fault**.

If `bpf_probe_read_user()` touches an unmapped address, the helper immediately aborts and returns `-EFAULT`. Many eBPF agents fail to handle this edge case defensively, logging an empty string or dropping the argument inspection altogether. By intentionally evicting pages right before a sensitive call using `madvise(..., MADV_DONTNEED)` or placing arguments across unmapped page boundaries, an attacker can blind the probe's inspection logic while the real kernel syscall handler happily faults the page back in milliseconds later.

## Active Evasion & Exploitation

So far, we have only exploited what eBPF *cannot* do - it cannot block synchronously on full ring buffers, and it cannot sleep to resolve page faults. Now let's look at how we can actively manipulate what eBPF *does* do.

### 1. Time-of-Check to Time-of-Use (TOCTOU)

One of the sharpest weapons against eBPF sensors hooked at the system call boundary is a classic concurrency race: **Time-of-Check to Time-of-Use (TOCTOU)**.

Many eBPF agents attach probes to the `sys_enter` tracepoint (such as `tracepoint/syscalls/sys_enter_execve`). When a program executes a binary, the timeline unfolds across two separate memory reads:

1. **Userspace:** Thread A places the benign path `"/bin/ls"` in a userspace buffer and invokes `execve()`.
2. **Kernel (`sys_enter`):** The eBPF probe fires at the syscall entry gate. It reads the pointer from userspace via `bpf_probe_read_user()`, sees `"/bin/ls"`, deems it harmless, and ships the telemetry event.
3. **Userspace Race:** In the microsecond window between `sys_enter` and actual kernel execution, a concurrent Thread B running in the same process space overwrites that exact userspace memory buffer with `"/bin/sh"`.
4. **Kernel Syscall Handler:** The kernel's internal `do_execveat_common()` handler finally dereferences the userspace pointer, copies the updated string into kernel space, and executes the shell.

```text
Attacker Thread A: [ Points pointer to "/bin/ls" ] ---> Calls execve()
                                                              |
eBPF sys_enter Probe: [ Reads pointer: "/bin/ls" ]  <---------+
                      [ Verdict: Benign. Passes. ]
                                                              |
Attacker Thread B: [ Overwrites buffer with "/bin/sh" ] <-----+ (Race window)
                                                              |
Kernel Syscall Handler: [ Reads buffer: "/bin/sh" ] ----------> Executes Root Shell!
```

Because userspace memory is shared across threads and inherently mutable, any eBPF probe that inspects userspace pointers *before* the kernel copies the arguments into immutable kernel memory is vulnerable to being raced.

### 2. The Double-Edged Sword: `bpf_probe_write_user`

What happens if an attacker compromises a privileged container or service holding `CAP_BPF` and `CAP_PERFMON` (or `CAP_SYS_ADMIN`)? At that point, we don't just evade eBPF - we weaponize it using `bpf_probe_write_user()`.

Kernel maintainers originally introduced this helper for chaos engineering and fault injection (like simulating network packet corruption in a test environment). It is so powerful that calling it immediately prints a warning banner to `dmesg`:

```text
process 'probe' is using bpf_probe_write_user, which may crash your system!
```

While the Verifier forbids eBPF from overwriting arbitrary *kernel* memory, `bpf_probe_write_user()` grants full permission to overwrite the *userspace* memory of whatever process triggered the hook.

For example, an attacker can attach an eBPF program to the exit of `getdents64` (the system call that reads directory entries). Whenever `ps`, `top`, or an EDR agent queries `/proc` to enumerate running processes, the eBPF probe intercepts the buffer being returned to userspace and rewrites the directory entry offsets in real time. The malicious process vanishes from process listings, and the EDR sees a pristine operating system while the implant runs in plain sight.

## Where Does AI Fit In?

To compensate for noisy rulesets, vendors increasingly layer machine learning models on top of eBPF telemetry streams to spot behavioral anomalies.

As I saw firsthand while training classifiers on `sysmonitor-ebpf` telemetry at Drexel, ML models are remarkably good at catching loud, unoptimized malware. However, when you pit stream-based classifiers against a patient adversary who understands how features are extracted, three mathematical blind spots emerge:

- **Living-off-the-Land (LotL) Homogeneity:** Syscall sequence models rely heavily on n-gram frequencies. An attacker who chains native administrative binaries (`find`, `xargs`, `tar`, `curl`) generates system call traces that are statistically indistinguishable from routine DevOps scripts or cron jobs.
- **Sliding-Window Evasion (Delayed Execution):** Real-time stream classifiers cannot hold infinite history in memory; they evaluate events inside bounded sliding windows. By introducing deliberate time delays between exploitation stages, an attacker pushes causal events outside the model's context window, severing the temporal graph.
- **Baseline Poisoning:** Cloud-native clusters are rarely static. Rolling deployments and sidecar updates force adaptive models to continuously recalibrate their definition of "normal." Gradually introducing micro-anomalies allows an attacker to drift the baseline without crossing the alert threshold.

## The Conclusion: The Cat-and-Mouse Game

Does this mean eBPF is broken or useless for security? **Not at all.**

eBPF remains one of the greatest leaps forward in Linux systems engineering. In fact, the defensive community is actively closing several of the architectural gaps we just explored. Modern frameworks are migrating away from `sys_enter` syscall tracepoints toward **`bpf-lsm`** (Linux Security Modules). By attaching directly to internal LSM hooks, eBPF programs can inspect kernel-copied objects *after* userspace pointers have been resolved - neutralizing TOCTOU races - and enforce synchronous blocking (returning `-EPERM` before an operation executes) rather than relying solely on asynchronous ring buffers.

Still, the takeaway for security engineers is timeless: **no abstraction is invincible.**

When we treat any technology as magic without scrutinizing its underlying mechanics - how memory pages fault, how ring buffers drain, and when pointers cross the userspace-kernel boundary - we trade real engineering for a false sense of security. eBPF didn't end the cat-and-mouse game on Linux; it just raised the stakes.

## References

- [Malware Detection in Cloud Native Environments via Host-Level System Call Tracing and Machine Learning Classification (ACM AICCC 2024)](https://dl.acm.org/doi/pdf/10.1145/3719384.3719465)
- [sysmonitor-ebpf: Host-Level eBPF Telemetry for Cloud Native Systems](https://github.com/mrdebator/sysmonitor-ebpf)
- [Red Team Summit 2025 Presentation: eBPF & AI-Powered EDRs - Can Red Teams Still Win?](/involvements/eBPF-AI-Powered-EDRs.pdf)
- [Mitigations are attack surface, too - Jann Horn, Google Project Zero (2020)](https://projectzero.google/2020/02/mitigations-are-attack-surface-too.html)
- [The Linux Kernel eBPF Instruction Set & Verifier Documentation](https://docs.kernel.org/bpf/verifier.html)
