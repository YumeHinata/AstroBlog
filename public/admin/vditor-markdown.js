(function () {
  const { CMS, React } = window;
  const h = CMS.h;

  class VditorControl extends CMS.WidgetControl {
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

    componentWillUnmount() {
      if (this.vditor) {
        this.vditor.destroy();
      }
    }

    render() {
      return h("div", {
        ref: (el) => {
          this.editor = el;
        },
      });
    }
  }

  const VditorPreview = ({ value }) =>
    h("pre", {}, value || "");

  CMS.registerWidget(
    "vditor-markdown",
    VditorControl,
    VditorPreview
  );

  console.log("[vditor] widget registered (Decap WidgetControl)");
})();
