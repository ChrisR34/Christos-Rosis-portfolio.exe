"use strict";

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.classList.add("js");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const menu = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".nav-links");
  menu.hidden = false;
  function closeMenu() {
    menu.setAttribute("aria-expanded", "false");
    menu.innerHTML = 'Menu <span aria-hidden="true">+</span>';
    navigation.classList.remove("is-open");
  }
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    menu.innerHTML = open
      ? 'Close <span aria-hidden="true">−</span>'
      : 'Menu <span aria-hidden="true">+</span>';
    navigation.classList.toggle("is-open", open);
  });
  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
      closeMenu();
      menu.focus();
    }
  });
  window.matchMedia("(min-width: 801px)").addEventListener("change", closeMenu);

  const navLinks = [...navigation.querySelectorAll("a")];
  const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));
  let scrollScheduled = false;
  function updateScroll() {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    document.querySelector(".reading-progress").style.width =
      `${available > 0 ? Math.min(100, (window.scrollY / available) * 100) : 0}%`;
    let current = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 160) current = section.id;
    }
    if (available > 0 && available - window.scrollY <= 2)
      current = sections[sections.length - 1].id;
    navLinks.forEach((link) => {
      if (link.hash === `#${current}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    scrollScheduled = false;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollScheduled) {
        scrollScheduled = true;
        requestAnimationFrame(updateScroll);
      }
    },
    { passive: true },
  );
  window.addEventListener("resize", updateScroll);
  updateScroll();

  // This is a local portfolio navigator, not an executable shell.
  document.getElementById("terminal-form").hidden = false;
  document.querySelector(".terminal-shortcuts").hidden = false;
  const terminalInput = document.getElementById("terminal-input");
  const terminalOutput = document.getElementById("terminal-output");
  const routes = {
    projects: "projects",
    about: "about",
    skills: "skills",
    contact: "contact",
    experience: "experience",
  };
  function runCommand(value) {
    const command = value.trim().toLowerCase();
    terminalInput.value = "";
    if (!command) {
      terminalOutput.textContent = "Type help to see the available commands.";
      return;
    }
    if (command === "help") {
      terminalOutput.textContent =
        "Commands: projects, about, skills, experience, contact, whoami, clear.";
      return;
    }
    if (command === "clear") {
      terminalOutput.textContent = "Workspace cleared. What would you like to explore?";
      return;
    }
    if (command === "whoami") {
      terminalOutput.textContent =
        "Christos Rosis — CS student, software developer and production technician. C# · TCP/IP · IoT.";
      return;
    }
    if (Object.hasOwn(routes, command)) {
      terminalOutput.textContent = `Opening ${command}…`;
      const target = document.getElementById(routes[command]);
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      target.scrollIntoView({
        behavior: reducedMotion.matches ? "instant" : "smooth",
        block: "start",
      });
      history.replaceState(null, "", `#${routes[command]}`);
      return;
    }
    terminalOutput.textContent = `Unknown command: ${command}. Try help.`;
  }
  document.getElementById("terminal-form").addEventListener("submit", (event) => {
    event.preventDefault();
    runCommand(terminalInput.value);
  });
  document
    .querySelectorAll("[data-command]")
    .forEach((button) =>
      button.addEventListener("click", () => runCommand(button.dataset.command)),
    );

  // A deliberately illustrative TCP flow: no network or device access.
  const send = document.getElementById("send-command");
  const commandSelect = document.getElementById("tcp-command");
  const log = document.getElementById("tcp-log");
  const flow = document.querySelector(".packet-flow");
  const nodes = [...document.querySelectorAll(".flow-node")];
  send.disabled = false;
  commandSelect.disabled = false;
  const wait = (ms) =>
    new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? 0 : ms));
  function activate(name) {
    nodes.forEach((node) => node.classList.toggle("is-active", node.dataset.node === name));
  }
  send.addEventListener("click", async () => {
    const command = commandSelect.value;
    send.disabled = true;
    commandSelect.disabled = true;
    send.textContent = "SENDING…";
    log.classList.remove("is-error");
    log.setAttribute("aria-busy", "true");
    flow.classList.add("is-running");
    try {
      activate("client");
      log.textContent = `CLIENT → ${command}\nPreparing a simulated request…`;
      await wait(500);
      activate("server");
      log.textContent = `CLIENT → ${command}\nSERVER → Matching the command to a handler…`;
      await wait(650);
      if (command === "INVALID") {
        log.classList.add("is-error");
        log.textContent =
          "CLIENT → INVALID\nSERVER → ERR:UNKNOWN_COMMAND\nRequest rejected. No instrument action taken.";
      } else {
        activate("instrument");
        log.textContent = `CLIENT → ${command}\nINSTRUMENT → Preparing a sample response…`;
        await wait(600);
        activate("client");
        const response = { "READ:TEMP": "TEMP:22.4 °C", "READ:HUM": "HUM:48.2 %", PING: "PONG" }[
          command
        ];
        log.textContent = `CLIENT → ${command}\nINSTRUMENT → ${response}\nCLIENT ← Response received. Simulation complete.`;
      }
    } finally {
      flow.classList.remove("is-running");
      log.setAttribute("aria-busy", "false");
      send.disabled = false;
      commandSelect.disabled = false;
      send.innerHTML = 'SEND <span aria-hidden="true">↗</span>';
    }
  });

  // Update simulated readings only while the preview is visible and enabled.
  const sensorToggle = document.getElementById("sensor-toggle");
  const sensorStatus = document.getElementById("sensor-status");
  const sampleTemps = [22.4, 22.5, 22.3, 22.6, 22.7, 22.5, 22.8, 22.6, 22.9, 22.7];
  const sampleHums = [48.2, 48.4, 48.1, 48.5, 48.3, 48.6, 48.2, 48.4, 48.1, 48.3];
  let sampleIndex = 0;
  let paused = reducedMotion.matches;
  let inView = false;
  let sensorTimer = null;
  const points = [32, 30, 35, 24, 28, 22, 26, 16, 21, 15, 19, 10, 17, 14];
  function refreshSensorState() {
    clearInterval(sensorTimer);
    sensorTimer = null;
    sensorToggle.textContent = paused ? "Resume updates" : "Pause updates";
    sensorStatus.textContent = paused
      ? "Sample data · updates paused"
      : "Sample data · updates every 3s · no live sensor";
    if (paused || !inView || document.hidden) return;
    sensorTimer = setInterval(() => {
      sampleIndex = (sampleIndex + 1) % sampleTemps.length;
      document.getElementById("temperature").textContent = sampleTemps[sampleIndex].toFixed(1);
      document.getElementById("humidity").textContent = sampleHums[sampleIndex].toFixed(1);
      points.shift();
      points.push(42 - (sampleTemps[sampleIndex] - 22) * 32);
      document
        .getElementById("sensor-line")
        .setAttribute(
          "points",
          points
            .map(
              (point, index) =>
                `${((index * 400) / (points.length - 1)).toFixed(1)},${point.toFixed(1)}`,
            )
            .join(" "),
        );
    }, 3000);
  }
  sensorToggle.hidden = false;
  sensorToggle.addEventListener("click", () => {
    paused = !paused;
    refreshSensorState();
  });
  reducedMotion.addEventListener("change", () => {
    paused = reducedMotion.matches;
    refreshSensorState();
  });
  document.addEventListener("visibilitychange", refreshSensorState);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      refreshSensorState();
    }).observe(document.querySelector(".sensor-preview"));
  } else {
    inView = true;
  }
  refreshSensorState();
});
(() => {
  const root = document.documentElement;
  const buttons = document.querySelectorAll("[data-theme-choice]");

  function setTheme(theme) {
    root.dataset.theme = theme;

    buttons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.themeChoice === theme)
      );
    });

    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch {
      // The toggle still works if browser storage is unavailable.
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      setTheme(button.dataset.themeChoice);
    });
  });

  setTheme(root.dataset.theme === "light" ? "light" : "dark");
})();