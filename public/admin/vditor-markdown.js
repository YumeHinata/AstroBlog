(function () {
  const h = window.CMS.h;

  class VditorControl extends window.React.Component {
    componentDidMount() {
      this.vditor = new window.Vditor(this.editor, {
        height: 500,
        mode: "sv",
        cache: { enable: false },
        value: this.props.value || "",
        input: (val) => {
          this.props.onChange(val);
        },
      });
    }

    render() {
      return h("div", {
        ref: (el) => (this.editor = el),
      });
    }
  }

  const VditorPreview = ({ value }) =>
    h("pre", {}, value || "");

  window.CMS.registerWidget(
    "vditor-markdown",
    VditorControl,
    VditorPreview
  );

  console.log("[vditor] widget registered (react)");
})();
