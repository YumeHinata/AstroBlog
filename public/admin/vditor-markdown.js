(function () {
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
})();
