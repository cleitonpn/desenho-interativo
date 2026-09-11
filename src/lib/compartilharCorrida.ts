import { renderizar, canvasParaBlob } from "./exportar";
import { MARCA } from "../config/marca";
import type { Personagem, Escolhas } from "./tipos";
export async function resultCard(
  person: Personagem,
  clothes: Escolhas,
  score: number,
): Promise<File> {
  const bird = await renderizar(person, clothes, "vermelho", {
    largura: 700,
    semAssinatura: true,
    transparente: true,
    opaco: true,
  });
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#faf6ed";
  c.fillRect(0, 0, 1080, 1350);
  c.strokeStyle = "#d8cabb";
  c.lineWidth = 2;
  for (let x = 0; x < 1080; x += 40) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, 1350);
    c.stroke();
  }
  c.textAlign = "center";
  c.fillStyle = "#352f28";
  c.font = "bold 26px Arial";
  c.fillText("O QUINTAL DO VITAL", 540, 100);
  c.font = "900 94px Arial";
  c.fillText(`${score} pontos`, 540, 225);
  c.fillStyle = "#e93625";
  c.font = "bold 30px Arial";
  c.fillText("MEU ESTILO. MINHA CORRIDA.", 540, 294);
  const ratio = Math.min(700 / bird.width, 780 / bird.height);
  c.drawImage(
    bird,
    (1080 - bird.width * ratio) / 2,
    360,
    bird.width * ratio,
    bird.height * ratio,
  );
  c.fillStyle = "#352f28";
  c.font = "26px Arial";
  c.fillText(MARCA.arroba, 540, 1220);
  c.font = "21px Arial";
  c.fillText("Desenhos que ganham vida. E viram tattoo.", 540, 1280);
  return new File(
    [await canvasParaBlob(canvas)],
    "minha-corrida-no-quintal.png",
    { type: "image/png" },
  );
}
export async function shareCard(file: File) {
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "Minha corrida no Quintal" });
    return;
  }
  const url = URL.createObjectURL(file),
    a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
