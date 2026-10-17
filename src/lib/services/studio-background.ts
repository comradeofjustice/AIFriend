/** Shared by the 3D page and its photo capture; other modes keep their own theme. */
export const STUDIO_BACKGROUND='linear-gradient(180deg, #fffaf2 0%, #f1e9df 60%, #e3e9e5 100%)';
export function drawStudioBackground(context:CanvasRenderingContext2D,width:number,height:number){
 const gradient=context.createLinearGradient(0,0,0,height);
 gradient.addColorStop(0,'#fffaf2');gradient.addColorStop(.6,'#f1e9df');gradient.addColorStop(1,'#e3e9e5');
 context.fillStyle=gradient;context.fillRect(0,0,width,height);
}
