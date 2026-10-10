---
title: "Anticheats vs Emulators"
type: distilled
tags:
  - Zettel/Distilled
created: 2025-10-30 21:13
domains:
  - "[[Operating Systems Internals]]"
---

# Anticheats vs Emulators

Today, a friend raised the fact that he had to re-enable Secure Boot on his PC to play Battlefield after previously disabling it to install the [[MuMu Player]] [[Emulator]] to play Destiny Rising. This seemed odd.

Firstly, why does an [[Anticheat Software]] care about Secure Boot?

Anticheat software requires Secure Boot because it guarantees a trusted, tamper-proof system environment _before_ the game and its anti-cheat even start. The most powerful cheats run as [[Linux Kernel]]-mode drivers or with [[Direct Memory Access (DMA)]], giving them "God Mode" access to hide from and block anti-cheat programs. Secure Boot acts as a bouncer during startup, verifying that only signed, legitimate software (like the Windows kernel and official drivers) can load. This allows Windows to enable its own kernel protections (like Memory Integrity), effectively blocking malicious cheat drivers from loading first and ensuring the anti-cheat software is running on a clean, secure foundation.

Secondly, why would an emulator ask you to disable Secure Boot? 

Apparently, [[Android]] emulators, including MuMu Player, rely heavily on [[Hardware Virtualization]] (VT-x or AMD-V) to run efficiently. Microsoft's built-in virtualization technologies like [[Hyper-V]] and [[Virtualization Based Security (VBS)]] (which often run on top of the hypervisor and are tied into [[Secure Boot]]) can conflict with or block the emulator's access to the necessary hardware features. Disabling these features in the [[Unified Extensible Firmware Interface (UEFI)]] settings and [[Windows]] settings resolves this conflict.

Alright, sounds reasonable.

But this raised another question, what does Secure Boot have to do with [[Virtualization]]? Doesn't Secure Boot's role end once the [[Operating System (OS)]] takes over?

Let's understand the interplay here:

## Part 1: The Key Components

First, let's recap the three core technologies at play. They are distinct but build upon each other.

- **[[Unified Extensible Firmware Interface (UEFI)]]:** This is the modern replacement for the old [[Basic Input-Output System (BIOS)]]. It's the low-level software that runs when you first power on your PC. Its job is to initialize your hardware (like the [[Central Processing Unit (CPU)]], [[Random Access Memory (RAM)]], and hard drives) and then hand control over to [[Windows]]' [[Bootloader]].
- **[[Secure Boot]]:** This is a **security feature _of_ UEFI**, not a separate thing. Its _only_ job is to verify the software that runs during the boot process. It acts like a bouncer with a guest list. It checks for a valid digital signature on the bootloader, the operating system kernel, and critical drivers. If a piece of software isn't signed by a trusted authority (like Microsoft), Secure Boot blocks it from loading. This is a powerful defense against [[Rootkits]] and other malware that try to hijack your PC before Windows even starts.
- **[[Virtualization]] (Intel VT-x / AMD-V):** This is a **hardware feature _of_ your CPU**. It provides a set of processor instructions that allow an operating system to create efficient, isolated [[Virtual Machines (VMs)]] or "guests." Each VM acts like a complete, separate computer. Emulators like MuMu (which emulates an Android phone) and [[Hyper-V]] (Microsoft's built-in virtualization) rely heavily on these CPU features for performance. Without them, emulation would be extremely slow, as it would have to be done entirely in software.

## Part 2: The Connection: Secure Boot, Windows & Virtualization Based Security (VBS)

This is the most critical part of the puzzle. While Secure Boot's primary job ends once the Windows kernel is loaded, **Windows uses the _status_ of Secure Boot as a prerequisite to enable its own advanced security features that _use_ virtualization.**

The main feature here is **[[Virtualization Based Security (VBS)]]**, with its most well-known component being **[[Windows#Memory Integrity]]** (also called "[[Windows#Core Isolation]]").

Here is the chain of events:

1. You turn on your PC.
2. **UEFI** starts, and **Secure Boot** verifies the Windows bootloader and kernel are legitimate.
3. Windows starts loading and sees that Secure Boot is enabled and virtualization is available.
4. Because this trusted foundation is set, Windows activates VBS.
5. **VBS** uses the CPU's **virtualization** hardware to create a tiny, isolated, and highly secure "bubble."
6. Windows then places its most critical security processes—including parts of the kernel and [[Windows#Local Security Authority Subsystem Service (LSASS)]]—inside this bubble. This is **Memory Integrity**.

Now, the OS kernel is protected by the hardware hypervisor. Even if malware gains admin-level control of your main Windows environment, it cannot access or tamper with the code running inside that secure bubble.

## Part 3: The Conflict: Why Emulators Like MuMu Require Disabling Secure Boot

The conflict arises because the emulator and Windows's VBS/Memory Integrity feature _both_ want to use the CPU's virtualization hardware, often in conflicting ways.

### Conflict 1: Hypervisor "Ownership"

A CPU's virtualization hardware can typically only be managed by one "main" hypervisor at a time. When Memory Integrity is on, the Windows Hypervisor is that manager. Some emulators (especially older or high-performance ones) are built as "Type 2" hypervisors and are not designed to run on top of another hypervisor (Hyper-V). They expect to have direct, exclusive control of the CPU's virtualization features. When they try to access this hardware and find it's already "owned" by Windows VBS, they fail to run.

### Conflict 2: Bypassing Kernel Protections (The Most Likely Reason)

This is the core issue. Memory Integrity is specifically designed to prevent any software—malicious or legitimate—from hooking into, modifying, or reading the OS kernel.
However, to achieve high performance, many emulators use special (and sometimes unsigned) drivers that need to operate at a very-low level. They might try to:

- Hook directly into kernel processes for graphics or input/output.
- Access hardware in ways that Memory Integrity deems unsafe (like for direct [[Graphical Processing Unit (GPU)]] or network card access).
- Modify system tables or inject code to manage the guest OS ([[Android]]).

**Memory Integrity sees this behavior as a threat**—it looks just like what a kernel-mode [[Rootkits]] would do—and blocks it. The emulator crashes or refuses to start.

**Therefore, to run the emulator, you must disable Memory Integrity.**

But because Memory Integrity relies on the trusted environment created by Secure Boot, Windows often requires you to **disable Secure Boot in the UEFI/BIOS first**. This breaks the entire "chain of trust," signaling to the OS that VBS cannot be safely run, which then allows Memory Integrity to be fully turned off.

## Conclusion: The Security Trade-Off

We are caught in a direct trade-off:

- **Secure Boot ON:** Enables VBS/Memory Integrity. This provides a highly secure Windows environment that is protected from kernel-level attacks. This is what modern games like _Battlefield_ (and their anti-cheat systems) now require to ensure a fair and secure gaming environment.
- **Secure Boot OFF:** Disables VBS/Memory Integrity. This "releases" the virtualization hardware from Windows's security grip and removes the kernel protection, allowing low-level emulators like MuMu to function. However, this leaves your PC more vulnerable to advanced malware.

The emulator's need to disable Secure Boot isn't about the boot process itself, but about disabling the **downstream OS security features (Memory Integrity)** that _depend_ on Secure Boot and _conflict_ with how the emulator is designed to work.

## References

- [[Windows]]
- [MuMu Player Help Center](https://www.mumuplayer.com/help/win/disable-hyper-v-core-isolation.html)
