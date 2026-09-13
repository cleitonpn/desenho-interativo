import type { Referencia } from "./bicho";
import { baixarCanvas } from "./exportar";
export async function baixarBrief(
  referencias: Referencia[],
  categorias: string[],
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 260 + Math.ceil(referencias.length / 2) * 330;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f6f1e7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#352f27";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText("Minha ideia para o Vital", 45, 70);
  ctx.font = "22px sans-serif";
  ctx.fillText(
    "Jogo do Bicho · referências para um desenho feito à mão",
    45,
    113,
  );
  for (let i = 0; i < referencias.length; i++) {
    const r = referencias[i],
      x = 45 + (i % 2) * 470,
      y = 160 + Math.floor(i / 2) * 330;
    ctx.fillStyle = "#fdf9f0";
    ctx.fillRect(x, y, 440, 300);
    ctx.strokeStyle = "#352f27";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, 440, 300);
    ctx.fillStyle = "#352f27";
    ctx.font = "20px sans-serif";
    ctx.fillText(categorias[i], x + 20, y + 35, 400);
    if (r.imagem) {
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          const timeout = setTimeout(
            () => reject(Error("Imagem indisponível")),
            5000,
          );
          image.onload = () => {
            clearTimeout(timeout);
            resolve(image);
          };
          image.onerror = () => {
            clearTimeout(timeout);
            reject(Error("Imagem indisponível"));
          };
          image.src = r.imagem!;
        });
        const escala = Math.min(380 / img.width, 180 / img.height);
        ctx.drawImage(
          img,
          x + (440 - img.width * escala) / 2,
          y + 55,
          img.width * escala,
          img.height * escala,
        );
      } catch {
        /* The reference name remains readable when an image fails. */
      }
    } else {
      ctx.fillStyle = "#ff1a0e";
      ctx.font = "bold 72px sans-serif";
      ctx.fillText(i === 0 ? r.id : "✳", x + 170, y + 165);
    }
    ctx.fillStyle = "#352f27";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(r.nome, x + 20, y + 273, 400);
  }
  ctx.font = "18px sans-serif";
  ctx.fillText(
    "O desenho final e o orçamento serão combinados com o Vital.",
    45,
    canvas.height - 35,
  );
  baixarCanvas(canvas, "minha-ideia-vital.png");
}
