"use strict";
for (const demo of document.querySelectorAll("video")) {
  const source=demo.querySelector("source");
  source?.addEventListener("error", () => {
    const a=document.createElement("a");a.href=source.src;a.textContent="Open this clip directly";demo.parentElement.append(a);
  },{once:true});
}