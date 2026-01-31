(function () {
    function register() {
        if (!window.CMS || !window.Vditor) {
            return false;
        }

        const VditorMarkdownWidget = {
            id: "vditor-markdown",

            control: function ({ value, onChange }) {
                const container = document.createElement("div");
                const editorDiv = document.createElement("div");
                container.appendChild(editorDiv);

                let vditor;

                vditor = new Vditor(editorDiv, {
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
            VditorMarkdownWidget.id,
            VditorMarkdownWidget.control,
            VditorMarkdownWidget.preview
        );

        console.log("[vditor] widget registered");
        return true;
    }

    // 轮询等待 CMS 就绪（Decap 官方推荐做法之一）
    const timer = setInterval(() => {
        if (register()) {
            clearInterval(timer);
        }
    }, 50);
})();
