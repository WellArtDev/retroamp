/* Clock Widget — example plugin.
 * Adds a small live clock panel to the sidebar.
 * Plugins receive the PlayerAPI object as their only argument.
 */
(function (PlayerAPI) {
  function render() {
    const now = new Date();
    PlayerAPI.addPanel({
      id: "clock-widget",
      title: "Clock",
      html: '<div style="font-family:monospace;font-size:18px">' +
        now.toLocaleTimeString() + '</div>' +
        '<div style="color:var(--text-dim)">' + now.toLocaleDateString() + '</div>',
    });
  }
  render();
  setInterval(render, 1000);
})(PlayerAPI);
