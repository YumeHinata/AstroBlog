(function () {
  function tryRegister() {
    if (!window.CMS || !window.Vditor) {
      return false;
    }

    const widget = {
      id: "vditor-markdown",

      control: function ({ value, onChange }) {
        const container = document.createElement("div");
        const editorDiv = document.createElement("div");
        container.appendChild(editorDiv);

        new window.Vditor(editorDiv, {
          height: 500,
          mode: "sv",
          cache: { enable: false },
          value: value || "",
          input: (val) => {
            onChange(val);
          },
        });

        return container;
      },

      preview: function ({ value }) {
        const pre = document.createElement("pre");
        pre.textContent = value || "";
        return pre;
      },
    };

    window.CMS.registerWidget(
      widget.id,
      widget.control,
      widget.preview
    );

    console.log("[vditor] widget registered");
    return true;
  }

  // 等页面和 decap-cms.js 都执行完
  const timer = setInterval(() => {
    try {
      if (tryRegister()) {
        clearInterval(timer);
      }
    } catch (e) {
      // 防御性：绝不让 admin 页面直接炸
      console.error("[vditor] register failed", e);
    }
  }, 50);
})();
