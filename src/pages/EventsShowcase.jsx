import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from '../config';

const GAP = 16;
const CARD_W_MOBILE = 280;
const CARD_W_DESKTOP = 320;
const MOBILE_BP = 768;

function absUrl(maybe, base) {
  if (!maybe) return null;
  try { return new URL(maybe).toString(); }
  catch {
    const p = maybe.startsWith("/") ? maybe : `/${maybe}`;
    return new URL(p, base).toString();
  }
}

function dt(x){ const d=new Date(x); return isNaN(d)?null:d; }

function isSameDay(a,b){
  return a.getFullYear()===b.getFullYear()
      && a.getMonth()===b.getMonth()
      && a.getDate()===b.getDate();
}

function showUpcomingOrActive(s, e, now=new Date()){
  const S = dt(s), E = dt(e);
  if (!S && !E) return false;
  if (E) return E >= now;
  if (S) return S >= now || now >= S;
  return false;
}

function shouldShow(ev, now=new Date()){
  const recurring = (ev.recurrence_rule === "weekly");
  const S = dt(ev.start_at);
  if (recurring) return !!(S && isSameDay(S, now));
  return showUpcomingOrActive(ev.start_at, ev.end_at, now);
}

function fmt(x){
  const d=dt(x); if(!d) return {day:"",time:""};
  return {
    day: d.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"}),
    time: d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})
  };
}

export default function EventsShowcase(){
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BP);
  useEffect(()=>{
    const onResize=()=>setIsMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener("resize", onResize);
    return ()=>window.removeEventListener("resize", onResize);
  },[]);

  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [current,setCurrent]=useState(0);
  const trackRef = useRef(null);
  const viewportRef = useRef(null);

  const startX=useRef(0), dx=useRef(0), dragging=useRef(false);

  useEffect(()=>{
    (async()=>{
      try{
        const {data}=await axios.get(`${BACKEND_URL}/api/events/public?horizon_days=60`);
        const list=(Array.isArray(data)?data:[]).map(ev=>{
          const raw=ev.image_url||ev.imageUrl||ev.image||ev.image_path||ev.imagePath||null;
          return {
            id: ev.id,
            title: String(ev.title ?? ""),
            description: String(ev.description ?? ""),
            start_at: ev.start_at || ev.start || null,
            end_at: ev.end_at || ev.end || null,
            link_url: ev.payment_url || ev.link_url || ev.link || null,
            button_label: ev.button_label || ev.buttonLabel || null,
            recurrence_rule: ev.recurrence_rule || ev.recurrenceRule || "none",
            recurrence_day_of_week: (ev.recurrence_day_of_week ?? ev.recurrenceDayOfWeek),
            image: raw ? absUrl(raw, BACKEND_URL) : null,
            sort_order: typeof ev.sort_order==="number" ? ev.sort_order : parseInt(ev.sort_order||0,10),
          };
        });
        setRows(list);
      }finally{ setLoading(false); }
    })();
  },[]);

  const events = useMemo(()=>{
    const now=new Date();
    return rows
      .filter(ev=>shouldShow(ev, now))
      .sort((a,b)=>{
        const sa = dt(a.start_at)?.getTime() ?? 0;
        const sb = dt(b.start_at)?.getTime() ?? 0;
        if (sa !== sb) return sa - sb;
        return (a.sort_order??0) - (b.sort_order??0);
      });
  },[rows]);

  useEffect(()=>{ if(events.length) setCurrent(0); },[events.length]);

  const prev = ()=> setCurrent(i => events.length ? (i===0? events.length-1 : i-1) : 0);
  const next = ()=> setCurrent(i => events.length ? (i===events.length-1? 0 : i+1) : 0);

  const computeOffset = () => {
    const vp = viewportRef.current;
    if (!vp) return 0;
    const CARD = isMobile ? CARD_W_MOBILE : CARD_W_DESKTOP;
    return current * (CARD + GAP) - (vp.clientWidth/2 - CARD/2);
  };

  useEffect(()=>{
    const track = trackRef.current;
    if(!track) return;
    const offset = computeOffset();
    track.style.transform = `translateX(${-offset}px)`;
  },[current, isMobile, events.length]);

  const onTouchStart=(e)=>{ dragging.current=true; startX.current=e.touches[0].clientX; dx.current=0; };
  const onTouchMove =(e)=>{ if(!dragging.current) return; dx.current=e.touches[0].clientX-startX.current; };
  const onTouchEnd  =()=>{ if(!dragging.current) return; dragging.current=false; const TH=50; if(dx.current<-TH) next(); else if(dx.current>TH) prev(); dx.current=0; };

  const handleBuy=(url)=> {
    const abs = absUrl(url, BACKEND_URL);
    if (abs) window.open(abs, "_blank", "noopener,noreferrer");
  };
  const handleComplete=()=> navigate("/complete");

  const CARD = isMobile ? CARD_W_MOBILE : CARD_W_DESKTOP;

  return (
    <div style={{ background:"#fff", minHeight:"100vh", paddingBottom:84 }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"16px 16px 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={()=>navigate(-1)} aria-label="Back"
                  style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", padding:6 }}>
            ←
          </button>
          <span style={{ fontWeight:600 }}>BACK</span>
        </div>
        <div style={{ textAlign:"center", marginTop:8 }}>
          <img src="/assets/img/logo.png" alt="logo" style={{ height:56, objectFit:"contain" }}/>
          <h2 style={{ marginTop:10, fontWeight:800 }}>Upcoming Event</h2>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"12px 16px 0", position:"relative" }}>
        {loading ? (
          <p style={{ textAlign:"center", color:"#666" }}>Loading…</p>
        ) : events.length===0 ? (
          <p style={{ textAlign:"center", color:"#666" }}>No active events.</p>
        ) : (
          <>
            {events.length>1 && (
              <>
                <button aria-label="previous" onClick={prev} style={arrowStyle("left")}>‹</button>
                <button aria-label="next" onClick={next} style={arrowStyle("right")}>›</button>
              </>
            )}

            <div
              ref={viewportRef}
              style={{
                width:"100%",
                maxWidth: isMobile ? 480 : 1100,
                margin:"0 auto",
                overflow:"hidden",
                position:"relative",
              }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div
                ref={trackRef}
                style={{
                  display:"flex",
                  gap:GAP,
                  width: events.length * (CARD + GAP),
                  transition:"transform 380ms ease",
                  padding:"0 0 14px",
                }}
              >
                {events.map((ev, idx)=>(
                  <Card
                    key={ev.id ?? idx}
                    ev={ev}
                    width={CARD}
                    isActive={idx===current}
                    onClick={()=>setCurrent(idx)}
                    onBuy={handleBuy}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            </div>

            {events.length>1 && (
              <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:8 }}>
                {events.map((_,i)=>(
                  <span key={i} onClick={()=>setCurrent(i)}
                        style={{
                          width:8, height:8, borderRadius:"50%",
                          background: i===current ? "#333":"#ccc",
                          cursor:"pointer"
                        }}/>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{
        position:"fixed", left:0, right:0, bottom:0,
        background:"linear-gradient(transparent, #fff 20%)",
        padding:"12px 16px 16px"
      }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <button type="button" onClick={handleComplete}
                  style={{
                    width:"100%", background:"#1E66FF", color:"#fff",
                    border:"none", borderRadius:12, padding:"14px 16px",
                    fontWeight:800, fontSize:16, cursor:"pointer",
                    boxShadow:"0 6px 16px rgba(30,102,255,.3)"
                  }}>
            Complete
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ ev, width, isActive, onClick, onBuy, isMobile }){
  const { day:sDay, time:sTime } = fmt(ev.start_at);
  const { day:eDay, time:eTime } = fmt(ev.end_at);

  const scale = isActive ? 1 : (isMobile ? 0.92 : 0.95);
  const opacity = isActive ? 1 : 0.85;
  const zIndex = isActive ? 2 : 1;

  const btnLabel = (ev.button_label ?? "").toString().trim() || "Register";
  const hasLink = !!ev.link_url;

  return (
    <article
      onClick={onClick}
      style={{
        width, minWidth:width, maxWidth:width,
        background:"#fff",
        border: isActive ? "2px solid #0d6efd" : "1px solid #e9e9e9",
        borderRadius:16,
        padding:14,
        display:"flex", flexDirection:"column",
        boxShadow: isActive ? "0 12px 28px rgba(0,0,0,.14)" : "0 8px 18px rgba(0,0,0,.08)",
        transform:`scale(${scale})`,
        opacity,
        zIndex,
        transition:"transform 260ms ease, opacity 260ms ease, box-shadow 260ms ease, border 260ms ease",
        cursor:"pointer",
      }}
    >
      <div style={{ width:"100%", aspectRatio:"1 / 1", borderRadius:10, overflow:"hidden", background:"#000" }}>
        {ev.image ? (
          <img
            src={ev.image}
            alt={ev.title}
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
            onError={(e)=> (e.currentTarget.style.display="none")}
          />
        ) : (
          <div style={{ width:"100%", height:"100%", display:"grid", placeItems:"center", color:"#aaa", background:"#111" }}>
            No image
          </div>
        )}
      </div>

      <h4 style={{ marginTop:12, marginBottom:6, fontWeight:800 }}>{ev.title}</h4>
      {ev.description && <p style={{ margin:0, color:"#444" }}>{ev.description}</p>}

      <div style={{ marginTop:10 }}>
        {sDay && <div style={{ fontWeight:700 }}>{sDay}{sTime ? ` - ${sTime}` : ""}</div>}
        {eDay && <div style={{ fontWeight:700 }}>{eDay}{eTime ? ` - ${eTime}` : ""}</div>}
      </div>

      <button
        type="button"
        onClick={(e)=>{
          e.stopPropagation();
          if (hasLink) onBuy(ev.link_url);
        }}
        disabled={!hasLink}
        aria-disabled={!hasLink}
        style={{
          marginTop:14,
          background: hasLink ? "#FFD400" : "#E5E5E5",
          color: hasLink ? "#000" : "#666",
          border:"none",
          borderRadius:12,
          padding:"12px 14px",
          fontWeight:800,
          cursor: hasLink ? "pointer" : "not-allowed",
          opacity: hasLink ? 1 : 0.9
        }}
      >
        {btnLabel}
      </button>
    </article>
  );
}

function arrowStyle(side){
  return {
    position:"absolute",
    top:"50%",
    transform:"translateY(-50%)",
    [side]: -6,
    width:44, height:44, borderRadius:"50%",
    border:"1px solid rgba(0,0,0,.1)",
    background:"rgba(255,255,255,.95)",
    color:"#000", display:"grid", placeItems:"center",
    fontSize:26, lineHeight:1, cursor:"pointer", zIndex:5,
    boxShadow:"0 6px 16px rgba(0,0,0,.12)"
  };
}
