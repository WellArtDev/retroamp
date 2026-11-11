/* Now Playing — example plugin.
 * Shows the current track in the sidebar with a copy button.
 */
(function (PlayerAPI) {
  function render(track) {
    const title = track ? track.title : "Nothing playing";
    const source = track ? track.source : "";
    PlayerAPI.addPanel({
      id: "now-playing",
      title: "Now Playing",
      html:
        '<div style="font-weight:700">' + escapeHtml(title) + '</div>' +
        (source ? '<div style="color:var(--text-dim)">' + escapeHtml(source) + '</div>' : "") +
        '<button class="chip" style="margin-top:6px" onclick="navigator.clipboard && navigator.clipboard.writeText(' +
        JSON.stringify(title) +
        ').then(function(){ PlayerAPI.toast(\'Copied: \' + ' + JSON.stringify(title) + '); })">Copy track name</button>',
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  render(PlayerAPI.getCurrentTrack());
  PlayerAPI.on("trackchange", render);
})(PlayerAPI);
