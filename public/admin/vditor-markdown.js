(function () {
    const VditorMarkdownWidget = {
        id: "vditor-markdown",

        control: function ({ value, onChange }) {
            const container = document.createElement("div");
            const editorDiv = document.createElement("div");

            container.appendChild(editorDiv);

            let vditor;

            setTimeout(() => {
                vditor = new Vditor(editorDiv, {
                    height: 500,
                    mode: "sv",
                    cache: { enable: false },
                    value: value || "",
                    input: (val) => {
                        onChange(val);
                    },
                });
            }, 0);

            return container;
        },

        preview: function ({ value }) {
            const pre = document.createElement("pre");
            pre.textContent = value || "";
            return pre;
        },
    };

    CMS.registerWidget(
        VditorMarkdownWidget.id,
        VditorMarkdownWidget.control,
        VditorMarkdownWidget.preview
    );
})();
