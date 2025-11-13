import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from '../config';
import UserHeader from '../components/UserHeader';

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

function showUpcomingOrActive(s, e, now=new Date()){
  const S = dt(s), E = dt(e);
  if (!S && !E) return false;
  
  if (E) {
    return E >= now;
  }
  
  if (S) {
    return S >= now;
  }
  
  return false;
}

function shouldShow(ev, now=new Date()){
  const recurring = (ev.recurrence_rule === "weekly");
  if (recurring) {
    const dayOfWeek = ev.recurrence_day_of_week;
    if (dayOfWeek === null || dayOfWeek === undefined) return false;
    
    const todayDOW = now.getDay();
    if (todayDOW !== parseInt(dayOfWeek, 10)) return false;
    
    const S = dt(ev.start_at);
    if (S && now < S) return false;
    
    if (ev.recurrence_until) {
      const until = dt(ev.recurrence_until);
      if (until) {
        until.setHours(23, 59, 59, 999);
        if (now > until) return false;
      }
    }
    
    return true;
  }
  return showUpcomingOrActive(ev.start_at, ev.end_at, now);
}

function fmt(x){
  const d=dt(x); if(!d) return {day:"",time:""};
  return {
    day: d.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"}),
    time: d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})
  };
}

function formatTimeRange(start, end) {
  const s = dt(start);
  if (!s) return "Time TBD";
  
  const pad = (n) => String(n).padStart(2, "0");
  const formatTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const formatDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  
  const e = dt(end);
  if (!e) {
    return formatTime(s);
  }
  
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) {
    return `${formatTime(s)} - ${formatTime(e)}`;
  }
  
  return `${formatDate(s)} ${formatTime(s)} → ${formatDate(e)} ${formatTime(e)}`;
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

  useEffect(()=>{
    const track = trackRef.current;
    const vp = viewportRef.current;
    if(!track || !vp) return;
    const CARD = isMobile ? CARD_W_MOBILE : CARD_W_DESKTOP;
    const offset = current * (CARD + GAP) - (vp.clientWidth/2 - CARD/2);
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
    <>
      <UserHeader />
      <div className="container-fluid">
        <div className="container text-center">
          <div className="row">
            <div className="col-12">
              <h5 className="h5-heading" style={{ fontSize: "1.8rem", marginTop: "20px", marginBottom: "10px" }}>
                Upcoming Events
              </h5>
              <p style={{ color: "#666", fontSize: "16px", marginBottom: "30px" }}>
                Check out what's happening and register for events
              </p>
            </div>
          </div>

          <div className="row">
            <div className="col-12 col-md-10 col-lg-10 mx-auto" style={{ position: "relative", minHeight: "400px" }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div className="spinner-border text-primary" style={{ width: "3rem", height: "3rem" }} role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p style={{ color: "#666", marginTop: "20px", fontSize: "16px" }}>Loading events...</p>
                </div>
              ) : events.length===0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ fontSize: "64px", marginBottom: "20px" }}>📅</div>
                  <h5 className="h5-heading" style={{ marginBottom: "15px" }}>No Active Events</h5>
                  <p style={{ color: "#666", fontSize: "15px", maxWidth: "500px", margin: "0 auto" }}>
                    There are no events scheduled at this time. Check back soon for upcoming events and activities!
                  </p>
                </div>
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
                    <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:20 }}>
                      {events.map((_,i)=>(
                        <button
                          key={i}
                          onClick={()=>setCurrent(i)}
                          aria-label={`Go to event ${i + 1}`}
                          style={{
                            width:i===current?24:10,
                            height:10,
                            borderRadius:5,
                            background: i===current ? "#007AFF":"#dee2e6",
                            border:"none",
                            cursor:"pointer",
                            transition:"all 0.3s ease",
                            padding:0
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="row mt-4 mb-4">
            <div className="col-12 col-md-6 col-lg-4 mx-auto">
              <button 
                type="button" 
                onClick={handleComplete}
                className="confirm-btn"
                style={{ width: "100%", fontSize: "17px" }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Card({ ev, width, isActive, onClick, onBuy, isMobile }){
  const { day:sDay } = fmt(ev.start_at);
  const timeRange = formatTimeRange(ev.start_at, ev.end_at);

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
        border: isActive ? "2px solid #007AFF" : "1px solid #e9e9e9",
        borderRadius:16,
        padding:0,
        display:"flex", flexDirection:"column",
        boxShadow: isActive ? "0 12px 28px rgba(0,0,0,.14)" : "0 8px 18px rgba(0,0,0,.08)",
        transform:`scale(${scale})`,
        opacity,
        zIndex,
        transition:"transform 260ms ease, opacity 260ms ease, box-shadow 260ms ease, border 260ms ease",
        cursor:"pointer",
        overflow:"hidden"
      }}
    >
      <div style={{ width:"100%", height:"160px", borderRadius:"16px 16px 0 0", overflow:"hidden", background:"#000", flexShrink:0 }}>
        {ev.image ? (
          <img
            src={ev.image}
            alt={ev.title}
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
            onError={(e)=> (e.currentTarget.style.display="none")}
          />
        ) : (
          <div style={{ width:"100%", height:"100%", display:"grid", placeItems:"center", color:"#aaa", background:"#2c3e50" }}>
            <span style={{ fontSize:"48px" }}>📅</span>
          </div>
        )}
      </div>

      <div style={{ padding:"18px 16px", display:"flex", flexDirection:"column", gap:"10px", flex:1 }}>
        <h4 style={{ margin:0, fontWeight:700, fontSize:"1.3rem", lineHeight:"1.3", color:"#2c3e50" }}>{ev.title}</h4>
        
        {ev.description && (
          <p style={{ 
            margin:0, 
            color:"#6c757d", 
            fontSize:"14px", 
            lineHeight:"1.5",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical"
          }}>
            {ev.description}
          </p>
        )}

        <div style={{ 
          marginTop:"auto", 
          paddingTop:"8px",
          borderTop:"1px solid #e9ecef"
        }}>
          {sDay && (
            <div style={{ 
              fontSize:"13px", 
              color:"#2c3e50",
              fontWeight:600,
              marginBottom:"6px",
              display:"flex",
              alignItems:"center",
              gap:"6px"
            }}>
              <span>📅</span>
              <span>{sDay}</span>
            </div>
          )}
          <div style={{ 
            fontSize:"13px", 
            color:"#6c757d",
            fontWeight: 600,
            display:"flex",
            alignItems:"center",
            gap:"6px"
          }}>
            <span>🕐</span>
            <span>{timeRange}</span>
          </div>
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
            marginTop:12,
            background: hasLink ? "#FFD400" : "#E5E5E5",
            color: hasLink ? "#000" : "#666",
            border:"none",
            borderRadius:10,
            padding:"14px 16px",
            fontWeight:700,
            fontSize:"15px",
            cursor: hasLink ? "pointer" : "not-allowed",
            opacity: hasLink ? 1 : 0.9,
            transition:"all 0.2s ease"
          }}
        >
          {btnLabel}
        </button>
      </div>
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
