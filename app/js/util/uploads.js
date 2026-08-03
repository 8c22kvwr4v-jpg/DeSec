// Enkel bildevelger med forhåndsvisning. Holder styr på valgte File-objekter i minnet.
export function createImagePicker(container) {
  const files = [];
  const drop = document.createElement("div");
  drop.className = "upload-drop";
  drop.textContent = "Trykk for å legge til bilder";
  const grid = document.createElement("div");
  grid.className = "thumb-grid";
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.capture = "environment";
  input.hidden = true;

  container.append(drop, grid, input);

  drop.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    for (const f of input.files) files.push(f);
    input.value = "";
    render();
  });

  function render() {
    grid.innerHTML = "";
    files.forEach((file, i) => {
      const thumb = document.createElement("div");
      thumb.className = "thumb";
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      const del = document.createElement("button");
      del.className = "del";
      del.type = "button";
      del.textContent = "×";
      del.addEventListener("click", () => { files.splice(i, 1); render(); });
      thumb.append(img, del);
      grid.append(thumb);
    });
  }

  return {
    getFiles: () => files.slice(),
    clear() { files.length = 0; render(); },
  };
}
