import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, ImageIcon, RefreshCw, Upload } from "lucide-react";

type SceneId = "business-card"|"storefront"|"product-box"|"coffee-cup"|"tshirt"|"phone";
type Scene = { id:SceneId; name:string; hint:string };

const scenes: Scene[] = [
  {id:"business-card",name:"Business Card",hint:"Clean desk presentation"},
  {id:"storefront",name:"Storefront Sign",hint:"Exterior brand sign"},
  {id:"product-box",name:"Product Box",hint:"Simple packaging concept"},
  {id:"coffee-cup",name:"Coffee Cup",hint:"Cup logo preview"},
  {id:"tshirt",name:"T-Shirt",hint:"Apparel chest print"},
  {id:"phone",name:"Phone Screen",hint:"Mobile brand preview"},
];

const control="w-full accent-violet-600";
const input="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white";

function roundedRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}
function loadImage(url:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url;});}

export default function MockupGeneratorTool(){
  const [logoUrl,setLogoUrl]=useState<string|null>(null);
  const [fileName,setFileName]=useState("logo.png");
  const [scene,setScene]=useState<SceneId>("business-card");
  const [scale,setScale]=useState(42);
  const [x,setX]=useState(50);
  const [y,setY]=useState(50);
  const [rotation,setRotation]=useState(0);
  const [opacity,setOpacity]=useState(100);
  const [bg,setBg]=useState("#efece7");
  const [busy,setBusy]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);

  useEffect(()=>()=>{if(logoUrl?.startsWith("blob:"))URL.revokeObjectURL(logoUrl)},[logoUrl]);

  const chooseFile=(file?:File)=>{
    if(!file||!file.type.startsWith("image/"))return;
    if(logoUrl?.startsWith("blob:"))URL.revokeObjectURL(logoUrl);
    setLogoUrl(URL.createObjectURL(file));
    setFileName(file.name);
  };
  const reset=()=>{setScale(42);setX(50);setY(50);setRotation(0);setOpacity(100);};
  const fit=()=>{setScale(34);setX(50);setY(50);setRotation(0);};
  const selected=useMemo(()=>scenes.find(s=>s.id===scene)!,[scene]);

  const drawScene=(ctx:CanvasRenderingContext2D,w:number,h:number)=>{
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    ctx.save();
    if(scene==="business-card"){
      ctx.shadowColor="rgba(0,0,0,.2)";ctx.shadowBlur=30;ctx.shadowOffsetY=18;
      ctx.fillStyle="#ffffff";roundedRect(ctx,w*.18,h*.28,w*.64,h*.44,28);ctx.fill();
      ctx.shadowColor="transparent";
      ctx.fillStyle="#e5e7eb";ctx.fillRect(w*.23,h*.62,w*.22,8);
    } else if(scene==="storefront"){
      ctx.fillStyle="#c9c3b9";ctx.fillRect(0,0,w,h*.72);
      ctx.fillStyle="#252525";ctx.fillRect(w*.12,h*.2,w*.76,h*.32);
      ctx.fillStyle="#7a6954";ctx.fillRect(0,h*.72,w,h*.28);
      ctx.fillStyle="#111827";ctx.fillRect(w*.18,h*.57,w*.64,h*.13);
    } else if(scene==="product-box"){
      ctx.fillStyle="#d8d0c3";
      ctx.beginPath();ctx.moveTo(w*.27,h*.26);ctx.lineTo(w*.66,h*.2);ctx.lineTo(w*.78,h*.34);ctx.lineTo(w*.39,h*.4);ctx.closePath();ctx.fill();
      ctx.fillStyle="#f8f5ef";ctx.fillRect(w*.27,h*.26,w*.39,h*.48);
      ctx.fillStyle="#bdb4a7";ctx.beginPath();ctx.moveTo(w*.66,h*.2);ctx.lineTo(w*.78,h*.34);ctx.lineTo(w*.78,h*.72);ctx.lineTo(w*.66,h*.74);ctx.closePath();ctx.fill();
    } else if(scene==="coffee-cup"){
      ctx.fillStyle="#d7d1c8";ctx.fillRect(0,h*.73,w,h*.27);
      ctx.fillStyle="#f8fafc";roundedRect(ctx,w*.32,h*.23,w*.34,h*.52,34);ctx.fill();
      ctx.strokeStyle="#f8fafc";ctx.lineWidth=24;ctx.beginPath();ctx.arc(w*.67,h*.47,w*.12,-Math.PI/2,Math.PI/2);ctx.stroke();
      ctx.fillStyle="#d6b37a";ctx.fillRect(w*.33,h*.48,w*.32,h*.13);
    } else if(scene==="tshirt"){
      ctx.fillStyle="#dcd7cf";ctx.fillRect(0,0,w,h);
      ctx.fillStyle="#111827";ctx.beginPath();ctx.moveTo(w*.34,h*.22);ctx.lineTo(w*.44,h*.17);ctx.lineTo(w*.56,h*.17);ctx.lineTo(w*.66,h*.22);ctx.lineTo(w*.79,h*.34);ctx.lineTo(w*.68,h*.45);ctx.lineTo(w*.63,h*.39);ctx.lineTo(w*.63,h*.82);ctx.lineTo(w*.37,h*.82);ctx.lineTo(w*.37,h*.39);ctx.lineTo(w*.32,h*.45);ctx.lineTo(w*.21,h*.34);ctx.closePath();ctx.fill();
    } else {
      ctx.fillStyle="#d9d5cf";ctx.fillRect(0,0,w,h);
      ctx.fillStyle="#111827";roundedRect(ctx,w*.35,h*.12,w*.3,h*.76,44);ctx.fill();
      ctx.fillStyle="#f8fafc";roundedRect(ctx,w*.375,h*.155,w*.25,h*.68,28);ctx.fill();
      ctx.fillStyle="#d1d5db";roundedRect(ctx,w*.45,h*.135,w*.1,h*.012,8);ctx.fill();
    }
    ctx.restore();
  };

  const logoArea=()=>{
    if(scene==="business-card")return {cx:.5,cy:.48,max:.48};
    if(scene==="storefront")return {cx:.5,cy:.36,max:.44};
    if(scene==="product-box")return {cx:.465,cy:.5,max:.28};
    if(scene==="coffee-cup")return {cx:.49,cy:.43,max:.2};
    if(scene==="tshirt")return {cx:.5,cy:.48,max:.25};
    return {cx:.5,cy:.5,max:.16};
  };

  const render=async(canvas:HTMLCanvasElement)=>{
    const ctx=canvas.getContext("2d");if(!ctx)return;
    const W=1200,H=900;canvas.width=W;canvas.height=H;drawScene(ctx,W,H);
    if(!logoUrl)return;
    const img=await loadImage(logoUrl);
    const a=logoArea();
    const base=Math.min(W,H)*a.max*(scale/42);
    const ratio=img.naturalWidth/img.naturalHeight;
    let dw=base,dh=base;
    if(ratio>=1)dh=dw/ratio;else dw=dh*ratio;
    const px=W*(a.cx+(x-50)/100*.32),py=H*(a.cy+(y-50)/100*.32);
    ctx.save();ctx.globalAlpha=opacity/100;ctx.translate(px,py);ctx.rotate(rotation*Math.PI/180);
    ctx.shadowColor="rgba(0,0,0,.12)";ctx.shadowBlur=10;
    ctx.drawImage(img,-dw/2,-dh/2,dw,dh);ctx.restore();
  };

  useEffect(()=>{if(canvasRef.current)void render(canvasRef.current)},[logoUrl,scene,scale,x,y,rotation,opacity,bg]);

  const download=async()=>{
    if(!canvasRef.current)return;setBusy(true);await render(canvasRef.current);
    canvasRef.current.toBlob(blob=>{if(blob){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${fileName.replace(/\.[^.]+$/,"")}-${scene}-mockup.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}setBusy(false);},"image/png",1);
  };

  return <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">1. Upload your logo</p>
        <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();chooseFile(e.dataTransfer.files?.[0])}} onClick={()=>fileRef.current?.click()} className="mt-4 cursor-pointer rounded-2xl border-2 border-dashed border-gray-200 p-7 text-center hover:border-violet-400 dark:border-gray-700">
          <Upload className="mx-auto mb-2 text-violet-500"/><p className="text-sm font-semibold">{logoUrl?fileName:"Drop a logo or click to upload"}</p><p className="mt-1 text-xs text-gray-400">PNG, JPG, SVG or WebP</p>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e=>chooseFile(e.target.files?.[0])}/>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">2. Choose a scene</p>
        <div className="mt-4 grid grid-cols-2 gap-2">{scenes.map(s=><button key={s.id} onClick={()=>setScene(s.id)} className={`rounded-xl border p-3 text-left transition ${scene===s.id?"border-violet-500 bg-violet-50 dark:bg-violet-950/30":"border-gray-200 dark:border-gray-700"}`}><span className="block text-xs font-bold">{s.name}</span><span className="mt-1 block text-[10px] text-gray-400">{s.hint}</span></button>)}</div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">3. Adjust placement</p>
        <div className="mt-4 space-y-4">
          <label className="block text-xs font-medium">Size <span className="float-right text-gray-400">{scale}%</span><input className={control} type="range" min="15" max="85" value={scale} onChange={e=>setScale(+e.target.value)}/></label>
          <label className="block text-xs font-medium">Horizontal <span className="float-right text-gray-400">{x}%</span><input className={control} type="range" min="0" max="100" value={x} onChange={e=>setX(+e.target.value)}/></label>
          <label className="block text-xs font-medium">Vertical <span className="float-right text-gray-400">{y}%</span><input className={control} type="range" min="0" max="100" value={y} onChange={e=>setY(+e.target.value)}/></label>
          <label className="block text-xs font-medium">Rotation <span className="float-right text-gray-400">{rotation}°</span><input className={control} type="range" min="-35" max="35" value={rotation} onChange={e=>setRotation(+e.target.value)}/></label>
          <label className="block text-xs font-medium">Opacity <span className="float-right text-gray-400">{opacity}%</span><input className={control} type="range" min="20" max="100" value={opacity} onChange={e=>setOpacity(+e.target.value)}/></label>
          <label className="block text-xs font-medium">Scene background<input className={input} type="color" value={bg} onChange={e=>setBg(e.target.value)}/></label>
          <div className="flex gap-2"><button onClick={fit} className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold dark:border-gray-700">Fit & center</button><button onClick={reset} className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold dark:border-gray-700"><RefreshCw size={13}/> Reset</button></div>
        </div>
      </section>
    </div>

    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{selected.name} preview</p><p className="text-xs text-gray-400">Your logo stays in this browser. Nothing is uploaded.</p></div><button onClick={download} disabled={!logoUrl||busy} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Download size={16}/>{busy?"Preparing…":"Download PNG"}</button></div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-950"><canvas ref={canvasRef} className="block h-auto w-full" aria-label="Logo mockup preview"/></div>
      {!logoUrl&&<div className="mt-4 flex items-center gap-2 rounded-xl bg-violet-50 p-3 text-xs text-violet-700 dark:bg-violet-950/30 dark:text-violet-200"><ImageIcon size={16}/>Upload a logo to place it into the selected mockup.</div>}
      <p className="mt-4 text-xs leading-5 text-gray-400">These starter scenes are generated directly by LogoViking and do not use third-party mockup artwork. They are intended for fast brand previews, concepts, proposals, and portfolio presentations.</p>
    </section>
  </div>;
}
