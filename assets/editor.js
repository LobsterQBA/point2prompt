(function () {
  "use strict";

  if (window.__POINT2PROMPT__) {
    window.__POINT2PROMPT__.open();
    return;
  }

  var intents = [
    "Rewrite copy",
    "Adjust spacing",
    "Improve visual hierarchy",
    "Fix responsive layout",
    "Improve contrast",
    "Match nearby style",
    "Polish interaction state",
    "Custom instruction"
  ];

  var formats = ["Claude Code", "Codex", "Cursor", "GitHub Issue", "Markdown"];
  var state = {
    active: false,
    selected: [],
    activeId: null,
    hoverEl: null,
    dragStart: null,
    marquee: null,
    suppressClick: false
  };

  var root;
  var hoverBox;
  var selectedLayer;
  var toastTimer;

  function open() {
    if (!root) {
      mount();
    }
    state.active = true;
    root.classList.remove("p2p-hidden");
    bind();
    render();
    showToast("Point2Prompt is active. Click an element to select it.");
  }

  function close() {
    state.active = false;
    if (root) {
      root.classList.add("p2p-hidden");
    }
    cleanupBoxes();
    unbind();
  }

  function toggle() {
    state.active ? close() : open();
  }

  function mount() {
    hoverBox = document.createElement("div");
    hoverBox.className = "p2p-hover";
    hoverBox.style.display = "none";
    document.body.appendChild(hoverBox);

    selectedLayer = document.createElement("div");
    selectedLayer.className = "p2p-selected-layer";
    document.body.appendChild(selectedLayer);

    root = document.createElement("div");
    root.id = "p2p-root";
    root.innerHTML = [
      '<div class="p2p-panel">',
      '  <div class="p2p-head">',
      '    <div>',
      '      <p class="p2p-title"><span class="p2p-mark"></span>Point2Prompt</p>',
      '      <p class="p2p-subtitle">Select UI, attach intent, copy agent-ready context.</p>',
      "    </div>",
      '    <button class="p2p-icon-btn" type="button" data-action="close" aria-label="Close">x</button>',
      "  </div>",
      '  <div class="p2p-body">',
      '    <div class="p2p-row">',
      '      <label class="p2p-label" for="p2p-format">Output format</label>',
      '      <select class="p2p-select" id="p2p-format"></select>',
      "    </div>",
      '    <div class="p2p-row">',
      '      <label class="p2p-label" for="p2p-intent">Intent preset</label>',
      '      <select class="p2p-select" id="p2p-intent"></select>',
      "    </div>",
      '    <div class="p2p-row">',
      '      <label class="p2p-label" for="p2p-instruction"><span>Instruction for selected item</span><span id="p2p-count">0 selected</span></label>',
      '      <textarea class="p2p-textarea" id="p2p-instruction" placeholder="Example: Make this headline shorter and more specific."></textarea>',
      "    </div>",
      '    <div class="p2p-row">',
      '      <div class="p2p-label">Selection stack</div>',
      '      <div class="p2p-list" id="p2p-list"></div>',
      "    </div>",
      '    <div class="p2p-actions">',
      '      <button class="p2p-btn" type="button" data-action="clear">Clear</button>',
      '      <button class="p2p-btn p2p-btn-primary" type="button" data-action="copy">Copy prompt</button>',
      "    </div>",
      "  </div>",
      '  <div class="p2p-foot">',
      "    <span>Click select</span>",
      "    <span>Shift multi</span>",
      "    <span>Arrows navigate</span>",
      "    <span>Esc clear</span>",
      "  </div>",
      "</div>"
    ].join("");
    document.body.appendChild(root);

    fillSelect(root.querySelector("#p2p-format"), formats);
    fillSelect(root.querySelector("#p2p-intent"), intents);
    root.querySelector("#p2p-intent").value = "Custom instruction";

    root.addEventListener("click", onPanelClick);
    root.querySelector("#p2p-list").addEventListener("click", onListClick);
    root.querySelector("#p2p-intent").addEventListener("change", onIntentChange);
    root.querySelector("#p2p-instruction").addEventListener("input", onInstructionInput);
  }

  function fillSelect(select, values) {
    select.innerHTML = values.map(function (value) {
      return '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + "</option>";
    }).join("");
  }

  function bind() {
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", renderBoxes, true);
    window.addEventListener("resize", renderBoxes, true);
  }

  function unbind() {
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("mousedown", onMouseDown, true);
    document.removeEventListener("mouseup", onMouseUp, true);
    document.removeEventListener("click", onDocumentClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("scroll", renderBoxes, true);
    window.removeEventListener("resize", renderBoxes, true);
  }

  function onPanelClick(event) {
    var action = event.target.getAttribute("data-action");
    if (!action) return;
    if (action === "close") close();
    if (action === "clear") {
      state.selected = [];
      state.activeId = null;
      render();
    }
    if (action === "copy") copyPrompt();
  }

  function onListClick(event) {
    var item = event.target.closest(".p2p-item");
    if (!item) return;
    state.activeId = item.getAttribute("data-id");
    syncActiveFields();
    render();
  }

  function onIntentChange(event) {
    var entry = getActiveEntry();
    if (!entry) return;
    entry.intent = event.target.value;
    render();
  }

  function onInstructionInput(event) {
    var entry = getActiveEntry();
    if (!entry) return;
    entry.instruction = event.target.value;
  }

  function onMouseMove(event) {
    if (!state.active || isOwnUi(event.target)) return;

    if (state.dragStart) {
      updateMarquee(event);
      return;
    }

    var el = getElementAt(event.clientX, event.clientY);
    if (!el || el === document.documentElement || el === document.body) {
      hoverBox.style.display = "none";
      state.hoverEl = null;
      return;
    }
    state.hoverEl = el;
    paintBox(hoverBox, el.getBoundingClientRect());
  }

  function onMouseDown(event) {
    if (!state.active || isOwnUi(event.target) || event.button !== 0) return;
    state.dragStart = { x: event.clientX, y: event.clientY };
  }

  function onMouseUp(event) {
    if (!state.active || !state.dragStart) return;
    var dx = Math.abs(event.clientX - state.dragStart.x);
    var dy = Math.abs(event.clientY - state.dragStart.y);
    if (dx > 8 || dy > 8) {
      event.preventDefault();
      event.stopPropagation();
      selectWithinMarquee(event.shiftKey);
      state.suppressClick = true;
    }
    removeMarquee();
    state.dragStart = null;
  }

  function onDocumentClick(event) {
    if (!state.active || isOwnUi(event.target)) return;
    if (state.suppressClick) {
      state.suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    var el = getElementAt(event.clientX, event.clientY);
    if (!el || el === document.body || el === document.documentElement) return;
    selectElement(el, event.shiftKey);
  }

  function onKeyDown(event) {
    if (!state.active) return;
    var fromPanel = isOwnUi(event.target);

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
      event.preventDefault();
      copyPrompt();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      state.selected = [];
      state.activeId = null;
      render();
      return;
    }

    if (fromPanel) return;

    var entry = getActiveEntry();
    if (!entry) return;
    var target = null;
    if (event.key === "ArrowUp") target = entry.el.parentElement;
    if (event.key === "ArrowDown") target = firstElementChild(entry.el);
    if (event.key === "ArrowLeft") target = entry.el.previousElementSibling;
    if (event.key === "ArrowRight") target = entry.el.nextElementSibling;
    if (!target || isOwnUi(target)) return;
    event.preventDefault();
    replaceActiveElement(target);
  }

  function selectElement(el, append) {
    if (!append) {
      state.selected = [];
    }
    var existing = state.selected.find(function (entry) {
      return entry.el === el;
    });
    if (existing) {
      state.activeId = existing.id;
    } else {
      var id = "p2p-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      state.selected.push({
        id: id,
        el: el,
        intent: root.querySelector("#p2p-intent").value || "Custom instruction",
        instruction: ""
      });
      state.activeId = id;
    }
    render();
  }

  function replaceActiveElement(el) {
    var entry = getActiveEntry();
    if (!entry) return;
    entry.el = el;
    render();
  }

  function selectWithinMarquee(append) {
    if (!state.marquee) return;
    var rect = state.marquee.getBoundingClientRect();
    var candidates = Array.prototype.slice.call(document.body.querySelectorAll("body *"));
    var matches = candidates.filter(function (el) {
      if (isOwnUi(el) || !isVisible(el)) return false;
      var r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4 && intersects(rect, r);
    }).slice(0, 12);
    if (!append) {
      state.selected = [];
      state.activeId = null;
    }
    matches.forEach(function (el) {
      if (!state.selected.some(function (entry) { return entry.el === el; })) {
        var id = "p2p-" + Date.now() + "-" + Math.random().toString(16).slice(2);
        state.selected.push({ id: id, el: el, intent: "Custom instruction", instruction: "" });
        state.activeId = id;
      }
    });
    render();
  }

  function updateMarquee(event) {
    if (!state.marquee) {
      state.marquee = document.createElement("div");
      state.marquee.className = "p2p-marquee";
      document.body.appendChild(state.marquee);
    }
    var x1 = Math.min(state.dragStart.x, event.clientX);
    var y1 = Math.min(state.dragStart.y, event.clientY);
    var x2 = Math.max(state.dragStart.x, event.clientX);
    var y2 = Math.max(state.dragStart.y, event.clientY);
    state.marquee.style.left = x1 + "px";
    state.marquee.style.top = y1 + "px";
    state.marquee.style.width = (x2 - x1) + "px";
    state.marquee.style.height = (y2 - y1) + "px";
  }

  function removeMarquee() {
    if (state.marquee) {
      state.marquee.remove();
      state.marquee = null;
    }
  }

  function render() {
    renderList();
    syncActiveFields();
    renderBoxes();
  }

  function renderList() {
    var list = root.querySelector("#p2p-list");
    root.querySelector("#p2p-count").textContent = state.selected.length + " selected";
    if (!state.selected.length) {
      list.innerHTML = '<div class="p2p-empty">Click anything on the page. Shift-click to build a change brief.</div>';
      return;
    }
    list.innerHTML = state.selected.map(function (entry, index) {
      var meta = describeElement(entry.el);
      return [
        '<button class="p2p-item ' + (entry.id === state.activeId ? "p2p-active" : "") + '" type="button" data-id="' + entry.id + '">',
        '  <span class="p2p-item-main">',
        '    <span class="p2p-item-name">' + escapeHtml(index + 1 + ". " + meta.label) + "</span>",
        '    <span class="p2p-item-text">' + escapeHtml(meta.text || meta.selector) + "</span>",
        "  </span>",
        '  <span class="p2p-chip">' + escapeHtml(entry.intent.split(" ")[0]) + "</span>",
        "</button>"
      ].join("");
    }).join("");
  }

  function syncActiveFields() {
    var entry = getActiveEntry();
    var intent = root.querySelector("#p2p-intent");
    var instruction = root.querySelector("#p2p-instruction");
    if (!entry) {
      instruction.value = "";
      instruction.disabled = true;
      intent.disabled = true;
      return;
    }
    instruction.disabled = false;
    intent.disabled = false;
    intent.value = entry.intent || "Custom instruction";
    instruction.value = entry.instruction || "";
  }

  function renderBoxes() {
    cleanupBoxes();
    state.selected.forEach(function (entry) {
      if (!document.documentElement.contains(entry.el)) return;
      var box = document.createElement("div");
      box.className = "p2p-box";
      box.setAttribute("data-label", describeElement(entry.el).label);
      paintBox(box, entry.el.getBoundingClientRect());
      selectedLayer.appendChild(box);
    });
  }

  function cleanupBoxes() {
    if (selectedLayer) selectedLayer.innerHTML = "";
    if (hoverBox) hoverBox.style.display = "none";
  }

  function paintBox(box, rect) {
    box.style.display = "block";
    box.style.left = Math.max(0, rect.left) + "px";
    box.style.top = Math.max(0, rect.top) + "px";
    box.style.width = Math.max(0, rect.width) + "px";
    box.style.height = Math.max(0, rect.height) + "px";
  }

  function copyPrompt() {
    if (!state.selected.length) {
      showToast("Select at least one element first.");
      return;
    }
    var prompt = buildPrompt(root.querySelector("#p2p-format").value);
    navigator.clipboard.writeText(prompt).then(function () {
      showToast("Prompt copied. Paste it into your coding agent.");
    }).catch(function () {
      fallbackCopy(prompt);
      showToast("Prompt copied with fallback.");
    });
  }

  function buildPrompt(format) {
    var lines = [];
    var title = "UI change brief generated by Point2Prompt";
    if (format === "GitHub Issue") {
      lines.push("# " + title);
      lines.push("");
      lines.push("## Goal");
      lines.push("Update the selected UI elements using the element context below.");
    } else {
      lines.push(title);
      lines.push("");
      lines.push("Task: Update the selected UI elements using the element context below.");
    }
    lines.push("");
    lines.push("Page: " + location.href);
    lines.push("Viewport: " + window.innerWidth + "x" + window.innerHeight);
    lines.push("Output target: " + format);
    lines.push("");
    lines.push("Selected elements:");
    state.selected.forEach(function (entry, index) {
      var meta = collectElementMeta(entry.el);
      lines.push("");
      lines.push((index + 1) + ". " + meta.label);
      lines.push("   selector: " + meta.selector);
      lines.push("   rect: x=" + meta.rect.x + ", y=" + meta.rect.y + ", w=" + meta.rect.width + ", h=" + meta.rect.height);
      lines.push("   text: " + quote(meta.text));
      lines.push("   intent: " + (entry.intent || "Custom instruction"));
      lines.push("   instruction: " + (entry.instruction || "No extra instruction provided."));
      if (meta.react.length) lines.push("   react: " + meta.react.join(" > "));
      if (meta.source) lines.push("   source: " + meta.source);
      lines.push("   styles: font=" + meta.styles.font + ", size=" + meta.styles.fontSize + ", color=" + meta.styles.color + ", background=" + meta.styles.backgroundColor + ", display=" + meta.styles.display);
      lines.push("   html: " + meta.html);
    });
    lines.push("");
    lines.push("Please make the smallest code change that satisfies the instructions. Preserve nearby behavior and visual intent unless the instruction says otherwise.");
    return lines.join("\n");
  }

  function collectElementMeta(el) {
    var rect = el.getBoundingClientRect();
    var styles = getComputedStyle(el);
    var react = getReactPath(el);
    return {
      label: describeElement(el).label,
      selector: getSelector(el),
      rect: {
        x: Math.round(rect.left + window.scrollX),
        y: Math.round(rect.top + window.scrollY),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      text: cleanText(el.innerText || el.textContent || ""),
      html: truncate(cleanText(el.outerHTML || ""), 420),
      styles: {
        font: styles.fontFamily,
        fontSize: styles.fontSize,
        color: styles.color,
        backgroundColor: styles.backgroundColor,
        display: styles.display
      },
      react: react.names,
      source: react.source
    };
  }

  function describeElement(el) {
    var id = el.id ? "#" + el.id : "";
    var cls = Array.prototype.slice.call(el.classList || []).filter(function (name) {
      return name.indexOf("p2p-") !== 0;
    }).slice(0, 3).map(function (name) {
      return "." + name;
    }).join("");
    return {
      label: el.tagName.toLowerCase() + id + cls,
      selector: getSelector(el),
      text: truncate(cleanText(el.innerText || el.textContent || ""), 96)
    };
  }

  function getSelector(el) {
    if (el.id) return "#" + cssEscape(el.id);
    var path = [];
    var node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      var part = node.tagName.toLowerCase();
      if (node.classList && node.classList.length) {
        part += "." + Array.prototype.slice.call(node.classList).filter(function (name) {
          return name.indexOf("p2p-") !== 0;
        }).slice(0, 2).map(cssEscape).join(".");
      }
      var sibling = node;
      var nth = 1;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.tagName === node.tagName) nth++;
      }
      part += ":nth-of-type(" + nth + ")";
      path.unshift(part);
      node = node.parentElement;
    }
    return "body > " + path.join(" > ");
  }

  function getReactPath(el) {
    var names = [];
    var source = "";
    var node = el;
    while (node && names.length < 8) {
      var key = Object.keys(node).find(function (item) {
        return item.indexOf("__reactFiber$") === 0 || item.indexOf("__reactInternalInstance$") === 0;
      });
      var fiber = key ? node[key] : null;
      while (fiber && names.length < 8) {
        var type = fiber.elementType || fiber.type;
        var name = typeof type === "function" ? (type.displayName || type.name) : typeof type === "string" ? type : "";
        if (name && names.indexOf(name) === -1) names.unshift(name);
        if (!source && fiber._debugSource) {
          source = fiber._debugSource.fileName + ":" + fiber._debugSource.lineNumber;
        }
        fiber = fiber.return;
      }
      node = node.parentElement;
    }
    return { names: names, source: source };
  }

  function getActiveEntry() {
    return state.selected.find(function (entry) {
      return entry.id === state.activeId;
    }) || state.selected[state.selected.length - 1];
  }

  function getElementAt(x, y) {
    var hidden = root ? root.style.pointerEvents : "";
    if (root) root.style.pointerEvents = "none";
    var el = document.elementFromPoint(x, y);
    if (root) root.style.pointerEvents = hidden;
    return el;
  }

  function firstElementChild(el) {
    return Array.prototype.find.call(el.children || [], function (child) {
      return !isOwnUi(child) && isVisible(child);
    });
  }

  function isOwnUi(el) {
    return !!(el && (el.id === "p2p-root" || el.closest && (el.closest("#p2p-root") || el.closest(".p2p-box") || el.closest(".p2p-hover") || el.closest(".p2p-marquee"))));
  }

  function isVisible(el) {
    var rect = el.getBoundingClientRect();
    var styles = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && styles.visibility !== "hidden" && styles.display !== "none";
  }

  function intersects(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function showToast(message) {
    if (!root) return;
    var existing = root.querySelector(".p2p-toast");
    if (existing) existing.remove();
    var toast = document.createElement("div");
    toast.className = "p2p-toast";
    toast.textContent = message;
    root.appendChild(toast);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.remove();
    }, 2200);
  }

  function fallbackCopy(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function cleanText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function truncate(text, length) {
    return text.length > length ? text.slice(0, length - 1) + "..." : text;
  }

  function quote(text) {
    return JSON.stringify(truncate(text || "", 260));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  window.__POINT2PROMPT__ = { open: open, close: close, toggle: toggle };
  open();
})();
