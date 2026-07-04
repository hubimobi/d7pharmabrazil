import { useEffect, useState } from "react";

const LP_CSS = `
  :root{
    --navy:#0F2947;
    --navy-2:#14315A;
    --navy-deep:#0A1F38;
    --blue:#1E5DDC;
    --blue-light:#4FA8E0;
    --green:#22C55E;
    --green-dark:#16A34A;
    --cream:#F5F3EF;
    --white:#FFFFFF;
    --text:#0F2947;
    --muted:#5B6B7E;
    --line:#E5E7EB;
    --radius:14px;
    --radius-btn:99px;
    --wrap:1180px;
  }
  .lp *{margin:0;padding:0;box-sizing:border-box}
  .lp{
    font-family:'Manrope',system-ui,-apple-system,sans-serif;
    color:var(--text);
    background:var(--cream);
    line-height:1.6;
    -webkit-font-smoothing:antialiased;
  }
  .lp .wrap{max-width:var(--wrap);margin:0 auto;padding:0 24px}
  .lp h1,.lp h2,.lp h3{font-weight:800;letter-spacing:-.02em;line-height:1.15;color:var(--navy)}
  .lp h2{font-size:clamp(1.75rem,3.4vw,2.5rem);margin:.4rem 0 1rem}
  .lp section{padding:80px 0}
  @media(max-width:720px){.lp section{padding:56px 0}}

  .lp .eyebrow{
    font-size:.72rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
    color:var(--blue);
  }

  /* TOPBAR */
  .lp .topbar{
    position:sticky;top:0;z-index:50;
    background:rgba(245,243,239,.92);backdrop-filter:blur(10px);
    border-bottom:1px solid var(--line);
  }
  .lp .topbar .wrap{display:flex;align-items:center;justify-content:space-between;height:72px}
  .lp .brand{display:flex;align-items:center;gap:.7rem}
  .lp .brand img{height:40px;width:auto;display:block}
  .lp .brand .tag{
    font-size:.65rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
    color:var(--navy);padding-left:.9rem;border-left:1px solid var(--line);
  }
  .lp .top-nav{display:flex;gap:2rem;align-items:center}
  .lp .top-nav a{
    font-size:.88rem;font-weight:600;color:var(--navy);text-decoration:none;
    letter-spacing:.02em;
  }
  .lp .top-nav a:hover{color:var(--blue)}
  .lp .top-cta{
    background:var(--green);color:#fff !important;
    padding:.7rem 1.4rem;border-radius:var(--radius-btn);
    box-shadow:0 6px 20px rgba(34,197,94,.28);
    transition:.2s;
  }
  .lp .top-cta:hover{background:var(--green-dark);transform:translateY(-1px)}
  @media(max-width:900px){
    .lp .top-nav a:not(.top-cta){display:none}
    .lp .brand .tag{display:none}
  }

  /* HERO */
  .lp .hero{
    background:var(--cream);
    padding:88px 0 72px;
    position:relative;overflow:hidden;
  }
  .lp .hero::before{
    content:"";position:absolute;top:-120px;right:-160px;
    width:520px;height:520px;border-radius:50%;
    background:radial-gradient(circle,rgba(30,93,220,.08),transparent 65%);
    pointer-events:none;
  }
  .lp .hero::after{
    content:"";position:absolute;bottom:-160px;left:-140px;
    width:480px;height:480px;border-radius:50%;
    background:radial-gradient(circle,rgba(79,168,224,.10),transparent 65%);
    pointer-events:none;
  }
  .lp .hero .wrap{position:relative;z-index:1}
  .lp .hero-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:56px;align-items:center}
  @media(max-width:900px){.lp .hero-grid{grid-template-columns:1fr;gap:40px}}
  .lp .hero h1{font-size:clamp(2rem,4.4vw,3.15rem);margin:1rem 0 1.2rem}
  .lp .hero h1 .hl{color:var(--blue)}
  .lp .hero p.lead{font-size:1.1rem;color:var(--muted);max-width:34rem}
  .lp .hero p.lead strong{color:var(--navy);font-weight:700}
  .lp .hero-tags{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.6rem}
  .lp .hero-tags span{
    background:var(--white);border:1px solid var(--line);
    font-size:.72rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:var(--navy);padding:.5rem .95rem;border-radius:var(--radius-btn);
  }

  /* EXCL CARD */
  .lp .excl-card{
    background:var(--navy);color:#fff;
    border-radius:22px;padding:2.2rem 2rem;
    box-shadow:0 30px 70px rgba(15,41,71,.28);
    position:relative;overflow:hidden;
  }
  .lp .excl-card::before{
    content:"";position:absolute;top:-40px;right:-40px;
    width:180px;height:180px;border-radius:50%;
    background:radial-gradient(circle,rgba(30,93,220,.35),transparent 70%);
  }
  .lp .excl-card .label{
    display:inline-block;font-size:.68rem;font-weight:700;letter-spacing:.16em;
    text-transform:uppercase;color:var(--blue-light);
    padding:.35rem .8rem;border:1px solid rgba(79,168,224,.4);border-radius:99px;
    margin-bottom:1.3rem;
  }
  .lp .excl-card .num{
    font-size:6.5rem;font-weight:800;line-height:.9;color:#fff;
    letter-spacing:-.04em;
  }
  .lp .excl-card .num-caption{font-size:.95rem;color:#B8CAE0;margin-top:.6rem}
  .lp .excl-card .divider{height:1px;background:rgba(255,255,255,.12);margin:1.6rem 0}
  .lp .excl-card .foot{font-size:.82rem;color:#8FA5C0;line-height:1.55}
  .lp .excl-card .foot strong{color:#fff;font-weight:700}

  /* VSL */
  .lp .vsl{background:var(--cream);padding-top:0}
  .lp .video-frame{
    position:relative;border-radius:var(--radius);overflow:hidden;
    aspect-ratio:16/9;max-width:900px;margin:0 auto;
    background:linear-gradient(135deg,var(--navy),var(--navy-deep));
    border:1px solid var(--line);
    box-shadow:0 20px 60px rgba(15,41,71,.2);
  }

  /* BUTTONS */
  .lp .btn{
    display:inline-flex;align-items:center;justify-content:center;gap:.6rem;
    font-family:'Manrope',sans-serif;font-weight:700;font-size:1rem;
    text-decoration:none;border-radius:var(--radius-btn);
    padding:1.1rem 2.2rem;border:none;cursor:pointer;
    transition:transform .15s,box-shadow .15s,background .15s;
    letter-spacing:.02em;
  }
  .lp .btn:focus-visible{outline:3px solid var(--blue);outline-offset:3px}
  .lp .btn-green{
    background:var(--green);color:#fff;
    box-shadow:0 10px 28px rgba(34,197,94,.32);
  }
  .lp .btn-green:hover{background:var(--green-dark);transform:translateY(-2px);box-shadow:0 14px 34px rgba(34,197,94,.4)}
  .lp .btn-wa{
    background:#25D366;color:#fff;
    box-shadow:0 10px 28px rgba(37,211,102,.32);
    padding:1.15rem 2.4rem;font-size:1.05rem;
  }
  .lp .btn-wa:hover{background:#1EB855;transform:translateY(-2px)}
  .lp .cta-block{text-align:center;margin-top:2.4rem}
  .lp .cta-note{font-size:.85rem;color:var(--muted);margin-top:.85rem;text-align:center}

  /* DATA STRIP */
  .lp .data-strip{background:var(--navy);color:#fff;padding:56px 0}
  .lp .data-strip h3{
    text-align:center;font-size:1.1rem;font-weight:600;
    margin-bottom:2rem;color:#B8CAE0;
  }
  .lp .data-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
  @media(max-width:820px){.lp .data-grid{grid-template-columns:repeat(2,1fr);gap:32px}}
  .lp .data-item{display:flex;gap:1rem;align-items:center}
  .lp .data-icon{
    flex:0 0 56px;height:56px;border-radius:50%;
    background:rgba(30,93,220,.18);border:1px solid rgba(79,168,224,.3);
    display:flex;align-items:center;justify-content:center;color:var(--blue-light);
  }
  .lp .data-item .v{font-size:1.7rem;font-weight:800;color:#fff;line-height:1;letter-spacing:-.02em}
  .lp .data-item .l{font-size:.82rem;color:#B8CAE0;margin-top:.3rem;line-height:1.35}
  .lp .data-src{text-align:center;font-size:.7rem;color:#5B7395;margin-top:2rem;letter-spacing:.1em}

  /* SECTION HEADER */
  .lp .section-header{text-align:center;max-width:44rem;margin:0 auto 3rem}
  .lp .section-header p.sub{color:var(--muted);font-size:1.05rem;margin-top:.5rem}

  /* BULLETS */
  .lp .bullets-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
  @media(max-width:760px){.lp .bullets-grid{grid-template-columns:1fr}}
  .lp .bullet{
    background:var(--white);border:1px solid var(--line);border-radius:var(--radius);
    padding:1.7rem;display:flex;gap:1.1rem;align-items:flex-start;transition:.2s;
  }
  .lp .bullet:hover{border-color:var(--blue);transform:translateY(-2px);box-shadow:0 12px 30px rgba(15,41,71,.08)}
  .lp .bullet .ic{
    flex:0 0 48px;height:48px;border-radius:12px;
    background:linear-gradient(135deg,var(--blue),var(--blue-light));
    display:flex;align-items:center;justify-content:center;color:#fff;
  }
  .lp .bullet.featured .ic{background:var(--green)}
  .lp .bullet h3{font-size:1.05rem;font-weight:800;margin-bottom:.35rem;color:var(--navy)}
  .lp .bullet p{font-size:.93rem;color:var(--muted);line-height:1.55}

  /* FAQ */
  .lp .faq{background:var(--white)}
  .lp .faq-list{max-width:840px;margin:2rem auto 0}
  .lp .faq-item{
    background:var(--cream);border:1px solid var(--line);
    border-radius:var(--radius);margin-bottom:.9rem;transition:.2s;overflow:hidden;
  }
  .lp .faq-item.open{border-color:var(--blue);background:#fff}
  .lp .faq-q{
    width:100%;background:none;border:none;text-align:left;cursor:pointer;
    display:flex;justify-content:space-between;align-items:center;gap:1rem;
    padding:1.35rem 1.6rem;font-family:inherit;font-weight:700;font-size:1rem;
    color:var(--navy);
  }
  .lp .faq-q .idx{
    display:inline-flex;align-items:center;justify-content:center;
    width:30px;height:30px;border-radius:50%;
    background:var(--blue);color:#fff;font-size:.75rem;font-weight:700;
    margin-right:.9rem;flex:0 0 auto;
  }
  .lp .faq-q .txt{flex:1}
  .lp .faq-q .chev{
    flex:0 0 auto;width:32px;height:32px;border-radius:50%;
    background:var(--white);border:1px solid var(--line);
    display:flex;align-items:center;justify-content:center;
    color:var(--blue);transition:transform .25s;
  }
  .lp .faq-item.open .chev{transform:rotate(180deg);background:var(--blue);color:#fff;border-color:var(--blue)}
  .lp .faq-a{max-height:0;overflow:hidden;transition:max-height .3s ease}
  .lp .faq-a p{padding:0 1.6rem 1.4rem 4.2rem;color:var(--muted);font-size:.94rem;line-height:1.65}

  /* TESTIMONIALS */
  .lp .depo-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
  @media(max-width:760px){.lp .depo-grid{grid-template-columns:1fr}}
  .lp .depo{
    background:var(--white);border:1px solid var(--line);border-radius:var(--radius);
    padding:1.9rem;position:relative;transition:.2s;
  }
  .lp .depo:hover{border-color:var(--blue-light);transform:translateY(-2px);box-shadow:0 12px 30px rgba(15,41,71,.08)}
  .lp .depo .stars{color:var(--green);letter-spacing:.15em;font-size:.9rem;margin-bottom:.9rem}
  .lp .depo p{font-size:.96rem;color:var(--navy);line-height:1.6}
  .lp .depo .who{
    margin-top:1.3rem;padding-top:1.1rem;border-top:1px solid var(--line);
    display:flex;align-items:center;gap:.9rem;
  }
  .lp .depo .avatar{
    width:44px;height:44px;border-radius:50%;
    background:linear-gradient(135deg,var(--blue),var(--blue-light));
    color:#fff;display:flex;align-items:center;justify-content:center;
    font-weight:800;font-size:1rem;flex:0 0 auto;
  }
  .lp .depo .who .info strong{display:block;font-size:.9rem;color:var(--navy)}
  .lp .depo .who .info span{font-size:.78rem;color:var(--muted)}

  /* ABOUT */
  .lp .about{background:var(--white)}
  .lp .about-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:2.5rem}
  @media(max-width:820px){.lp .about-grid{grid-template-columns:1fr}}
  .lp .about-card{
    background:var(--cream);border:1px solid var(--line);
    border-radius:var(--radius);padding:2rem;transition:.2s;
  }
  .lp .about-card:hover{border-color:var(--blue);transform:translateY(-2px)}
  .lp .about-card .company-mark{
    display:inline-block;font-size:.7rem;font-weight:800;letter-spacing:.14em;
    text-transform:uppercase;color:#fff;background:var(--blue);
    padding:.4rem .85rem;border-radius:99px;margin-bottom:1.1rem;
  }
  .lp .about-card h3{color:var(--navy);font-size:1.35rem;margin-bottom:.7rem}
  .lp .about-card p{font-size:.96rem;color:var(--muted);line-height:1.65}
  .lp .actives{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.3rem}
  .lp .actives span{
    background:var(--white);border:1px solid var(--line);
    font-size:.72rem;font-weight:700;letter-spacing:.05em;
    padding:.4rem .75rem;border-radius:6px;color:var(--navy);
  }
  .lp .about-merge{
    margin-top:24px;background:var(--navy);color:#fff;
    border-radius:var(--radius);padding:2rem 2.2rem;
    font-size:1rem;line-height:1.7;
  }
  .lp .about-merge strong{color:var(--blue-light)}

  /* CONTACT */
  .lp .contact{
    background:var(--cream);text-align:center;
    position:relative;overflow:hidden;
  }
  .lp .contact::before{
    content:"";position:absolute;top:-100px;left:50%;transform:translateX(-50%);
    width:600px;height:600px;border-radius:50%;
    background:radial-gradient(circle,rgba(30,93,220,.07),transparent 65%);
    pointer-events:none;
  }
  .lp .contact .wrap{position:relative;z-index:1}
  .lp .contact p.sub{max-width:34rem;margin:.5rem auto 0;color:var(--muted);font-size:1.05rem}
  .lp .contact p.sub strong{color:var(--navy)}

  /* FOOTER */
  .lp footer{background:var(--navy-deep);color:#8FA5C0;padding:56px 0 32px;font-size:.82rem}
  .lp footer .foot-top{
    display:grid;grid-template-columns:1.3fr 1fr;gap:40px;
    padding-bottom:2rem;border-bottom:1px solid rgba(255,255,255,.08);
  }
  @media(max-width:760px){.lp footer .foot-top{grid-template-columns:1fr}}
  .lp footer .brand-foot img{height:44px;filter:brightness(0) invert(1);opacity:.95;margin-bottom:1rem}
  .lp footer .disc{line-height:1.7;max-width:32rem}
  .lp footer .foot-row{
    display:flex;justify-content:space-between;gap:2rem;flex-wrap:wrap;
    margin-top:1.6rem;font-size:.76rem;color:#5B7395;
  }

  /* MODAL */
  .lp .modal-overlay{
    position:fixed;inset:0;
    background:rgba(15,41,71,.65);backdrop-filter:blur(5px);
    z-index:200;
    display:flex;align-items:center;justify-content:center;
    padding:20px;
    animation:lpFadeIn .18s ease;
  }
  @keyframes lpFadeIn{from{opacity:0}to{opacity:1}}
  .lp .modal{
    background:#fff;border-radius:20px;
    padding:2.2rem 2rem 2rem;
    max-width:540px;width:100%;
    max-height:92vh;overflow-y:auto;
    box-shadow:0 40px 100px rgba(15,41,71,.35);
    position:relative;
    animation:lpSlideUp .22s ease;
  }
  @keyframes lpSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .lp .modal-close{
    position:absolute;top:1rem;right:1rem;
    width:36px;height:36px;border-radius:50%;
    border:1px solid var(--line);background:var(--cream);
    cursor:pointer;display:flex;align-items:center;justify-content:center;
    color:var(--muted);transition:.15s;
  }
  .lp .modal-close:hover{background:var(--line);color:var(--navy)}
  .lp .modal-head{margin-bottom:1.4rem}
  .lp .modal-head .eyebrow{margin-bottom:.4rem}
  .lp .modal-head h3{font-size:1.35rem;color:var(--navy);margin-bottom:.3rem}
  .lp .modal-head p{font-size:.88rem;color:var(--muted);line-height:1.5}
  .lp .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:480px){.lp .form-row{grid-template-columns:1fr}}
  .lp .form-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
  .lp .form-field label{
    font-size:.72rem;font-weight:700;color:var(--navy);
    letter-spacing:.06em;text-transform:uppercase;
  }
  .lp .form-field input,
  .lp .form-field select{
    height:48px;border:1.5px solid var(--line);border-radius:10px;
    padding:0 14px;font-family:'Manrope',sans-serif;
    font-size:.95rem;color:var(--navy);background:var(--cream);
    transition:border-color .15s,background .15s;outline:none;
    appearance:none;-webkit-appearance:none;
  }
  .lp .form-field select{
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%235B6B7E' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 14px center;
    padding-right:36px;cursor:pointer;
  }
  .lp .form-field input:focus,
  .lp .form-field select:focus{border-color:var(--blue);background:#fff}
  .lp .form-field input::placeholder{color:#B0BAC6}
  .lp .btn-modal-wa{
    width:100%;margin-top:6px;
    background:#25D366;color:#fff;
    padding:1.05rem;border-radius:var(--radius-btn);
    font-family:'Manrope',sans-serif;font-size:1rem;font-weight:700;
    border:none;cursor:pointer;
    display:flex;align-items:center;justify-content:center;gap:.6rem;
    transition:background .15s,transform .15s;
    box-shadow:0 8px 24px rgba(37,211,102,.3);
  }
  .lp .btn-modal-wa:hover{background:#1EB855;transform:translateY(-1px)}
  .lp .modal-legal{
    text-align:center;font-size:.72rem;color:var(--muted);
    margin-top:1rem;line-height:1.5;
  }
`;

const FAQ_ITEMS = [
  {
    q: "O que é, exatamente, o TCF-4?",
    a: 'O TCF-4 é um protocolo nutricional desenvolvido para oferecer suporte durante a fase de manutenção dos resultados, após o tratamento para controle de peso com agonistas de GLP-1 (as "canetas"). Ele foi pensado para o momento do desmame — sempre associado a alimentação equilibrada, atividade física e acompanhamento profissional.',
  },
  {
    q: "O TCF-4 substitui as canetas ou a medicação?",
    a: "Não. O TCF-4 não é medicamento e não se apresenta, em nenhum momento, como substituto da medicação ou da orientação médica. Ele atua exclusivamente como suporte nutricional na fase de manutenção, dentro das boas práticas regulatórias do mercado magistral.",
  },
  {
    q: "Como funciona a exclusividade territorial?",
    a: "Em cada município, credenciamos apenas uma farmácia de manipulação (e uma clínica médica). Enquanto o contrato estiver vigente, nenhuma outra farmácia da cidade poderá comercializar o protocolo TCF-4. As cidades são credenciadas conforme disponibilidade — e cada cidade fechada é uma vaga que não volta.",
  },
  {
    q: "Como funciona a marca própria (Private Label)?",
    a: "O protocolo é comercializado com a identidade visual da sua farmácia: embalagem personalizada, material técnico e comercial exclusivo, estratégia de posicionamento e suporte para implantação na sua rotina. Você não compra um produto de terceiros — constrói um ativo com o nome da sua farmácia.",
  },
  {
    q: "Quem desenvolve e respalda o protocolo?",
    a: "O TCF-4 nasce da união entre a R7 do Brasil — referência na importação e distribuição de ativos farmacêuticos e nutracêuticos como SODMAX, MoroOrange, Silex-Si, Skin Beauty e 3Joint — e a D7 Pharma do Brasil, especializada no desenvolvimento de formulações inovadoras. Empresas que já fazem parte do dia a dia do mercado magistral brasileiro.",
  },
  {
    q: "Que apoio de marketing e vendas eu recebo?",
    a: "A farmácia credenciada recebe materiais técnicos e comerciais prontos para apresentação do protocolo a prescritores e pacientes, além de estratégia de posicionamento e suporte na implantação — facilitando a captação de médicos, nutricionistas e a divulgação local.",
  },
  {
    q: "Como sei se a minha cidade ainda está disponível?",
    a: "Clique em qualquer botão desta página e fale com a nossa equipe pelo WhatsApp. Verificamos na hora se a exclusividade do seu município ainda está aberta e apresentamos os próximos passos para desenvolver o TCF-4 com a identidade da sua farmácia.",
  },
];

const TESTIMONIALS = [
  {
    text: "Atendíamos dezenas de receitas de caneta por semana e perdíamos o paciente logo depois do tratamento. Com o TCF-4, a fase de manutenção virou a nossa maior fonte de recompra.",
    role: "Farmacêutica responsável",
  },
  {
    text: "O que mais nos convenceu foi a marca própria. Não estamos vendendo o produto de outra empresa — estamos construindo o nosso protocolo, com exclusividade na cidade.",
    role: "Sócio-proprietário",
  },
  {
    text: "Os prescritores da região abraçaram rápido. Ter um protocolo exclusivo para o pós-desmame virou argumento de visita: hoje recebemos prescrições que antes não existiam.",
    role: "Diretora técnica",
  },
  {
    text: "Trabalhar com respaldo da R7 e da D7 Pharma fez diferença: ativos que já conhecíamos, material técnico pronto e suporte real na implantação. Foi plug and play.",
    role: "Farmacêutico responsável",
  },
];

const WA_NUMBER = "5547997476886";

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
];

const PERFIL_OPTIONS = [
  "Proprietário de uma Farmácia",
  "Farmacêutico",
  "Médico",
  "Profissional da Área da Saúde",
  "Outro",
];

type FormData = {
  nome: string;
  sobrenome: string;
  email: string;
  whatsapp: string;
  perfil: string;
  cidade: string;
  estado: string;
};

export default function FarmaciasPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormData>({
    nome: "", sobrenome: "", email: "",
    whatsapp: "", perfil: "", cidade: "", estado: "",
  });

  function openModal() { setModalOpen(true); }
  function closeModal() { setModalOpen(false); }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = encodeURIComponent(
      `Olá! Quero verificar a disponibilidade do TCF-4 na minha cidade.\n\n` +
      `👤 Nome: ${form.nome} ${form.sobrenome}\n` +
      `📧 E-mail: ${form.email}\n` +
      `📱 WhatsApp: ${form.whatsapp}\n` +
      `🏷️ Perfil: ${form.perfil}\n` +
      `📍 Cidade/UF: ${form.cidade}/${form.estado}`
    );
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank", "noopener,noreferrer");
    closeModal();
  }
  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  useEffect(() => {
    const prev = document.title;
    document.title = "TCF-4 · Exclusividade para Farmácias de Manipulação | D7 Pharma";
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    const links = [
      Object.assign(document.createElement("link"), { rel: "preconnect", href: "https://fonts.googleapis.com" }),
      Object.assign(document.createElement("link"), { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" }),
      Object.assign(document.createElement("link"), {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
      }),
    ];
    links.forEach((l) => document.head.appendChild(l));
    return () => links.forEach((l) => l.remove());
  }, []);

  useEffect(() => {
    function toggle(this: HTMLButtonElement) {
      const item = this.closest<HTMLElement>(".faq-item")!;
      const ans = item.querySelector<HTMLElement>(".faq-a")!;
      const wasOpen = item.classList.contains("open");
      document.querySelectorAll<HTMLElement>(".lp .faq-item.open").forEach((o) => {
        o.classList.remove("open");
        (o.querySelector<HTMLElement>(".faq-a"))!.style.maxHeight = "";
        (o.querySelector<HTMLElement>(".faq-q"))!.setAttribute("aria-expanded", "false");
      });
      if (!wasOpen) {
        item.classList.add("open");
        ans.style.maxHeight = ans.scrollHeight + "px";
        this.setAttribute("aria-expanded", "true");
      }
    }
    const btns = Array.from(document.querySelectorAll<HTMLButtonElement>(".lp .faq-q"));
    btns.forEach((b) => b.addEventListener("click", toggle));
    return () => btns.forEach((b) => b.removeEventListener("click", toggle));
  }, []);

  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: LP_CSS }} />

      {/* TOPBAR */}
      <div className="topbar">
        <div className="wrap">
          <div className="brand">
            <img src="/logo-d7-pharma.png" alt="D7 Pharma - Indústria de Suplementos" />
            <span className="tag">TCF-4 · Protocolo Exclusivo</span>
          </div>
          <nav className="top-nav">
            <a href="#video">Vídeo</a>
            <a href="#vantagens">Vantagens</a>
            <a href="#faq">FAQ</a>
            <a href="#quem-somos">Quem Somos</a>
            <a className="top-cta" href="#contato">Fale Conosco</a>
          </nav>
        </div>
      </div>

      {/* HERO */}
      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">Protocolo de manutenção pós-GLP-1 · Marca própria</div>
            <h1>
              O tratamento com as canetas termina.<br />
              <span className="hl">Quem vai atender o paciente depois: a sua farmácia — ou a concorrente?</span>
            </h1>
            <p className="lead">
              O <strong>TCF-4</strong> é o protocolo nutricional de suporte à fase de manutenção dos resultados após o
              tratamento com agonistas de GLP-1 — licenciado com a <strong>sua marca</strong> e com{" "}
              <strong>exclusividade territorial: apenas 1 farmácia de manipulação por cidade</strong>.
            </p>
            <div className="hero-tags">
              <span>✓ Private Label</span>
              <span>✓ Exclusividade por município</span>
              <span>✓ Material técnico + comercial</span>
            </div>
          </div>
          <div className="excl-card">
            <span className="label">Exclusividade Territorial</span>
            <div className="num">01</div>
            <div className="num-caption">farmácia de manipulação credenciada por município</div>
            <div className="divider" />
            <p className="foot">
              Enquanto o contrato estiver vigente,{" "}
              <strong>nenhuma outra farmácia da sua cidade</strong> poderá comercializar o protocolo TCF-4.
            </p>
          </div>
        </div>
      </header>

      {/* VSL */}
      <section className="vsl" id="video">
        <div className="wrap">
          <div className="video-frame">
            <iframe
              src="https://www.youtube.com/embed/wh3Xvl72bw8"
              title="TCF-4 · Protocolo de manutenção pós-GLP-1"
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="cta-block">
            <a className="btn btn-green" href="#contato">QUERO SABER MAIS</a>
            <p className="cta-note">Resposta em horário comercial · verificação de disponibilidade da sua cidade</p>
          </div>
        </div>
      </section>

      {/* DATA STRIP */}
      <div className="data-strip">
        <div className="wrap">
          <h3>O mercado brasileiro de GLP-1 em números</h3>
          <div className="data-grid">
            <div className="data-item">
              <div className="data-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div>
                <div className="v">R$ 20 bi</div>
                <div className="l">projeção do mercado em 2026</div>
              </div>
            </div>
            <div className="data-item">
              <div className="data-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <div className="v">3–5 mi</div>
                <div className="l">brasileiros usando canetas hoje</div>
              </div>
            </div>
            <div className="data-item">
              <div className="data-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 17l6-6 4 4 8-8" />
                  <path d="M14 7h7v7" />
                </svg>
              </div>
              <div>
                <div className="v">15 mi</div>
                <div className="l">usuários projetados até 2030</div>
              </div>
            </div>
            <div className="data-item">
              <div className="data-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
              </div>
              <div>
                <div className="v">100%</div>
                <div className="l">chegam ao desmame um dia</div>
              </div>
            </div>
          </div>
          <div className="data-src">FONTE: RELATÓRIOS E PROJEÇÕES DO SETOR FARMACÊUTICO · VALORES ESTIMADOS</div>
        </div>
      </div>

      {/* BULLETS */}
      <section id="vantagens">
        <div className="wrap">
          <div className="section-header">
            <div className="eyebrow">Por que fechar a exclusividade</div>
            <h2>O que a sua farmácia ganha com o TCF-4 em marca própria</h2>
            <p className="sub">Compromisso com resultado, exclusividade e valor recorrente — em cada detalhe.</p>
          </div>
          <div className="bullets-grid">
            <div className="bullet featured">
              <div className="ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l2.9 6.3 6.6.7-5 4.5 1.4 6.5L12 16.8 6.1 20l1.4-6.5-5-4.5 6.6-.7L12 2z" />
                </svg>
              </div>
              <div>
                <h3>Exclusividade territorial real</h3>
                <p>Apenas uma farmácia de manipulação credenciada por município. Na sua cidade, ou é você — ou é a concorrente.</p>
              </div>
            </div>
            <div className="bullet featured">
              <div className="ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M8 7V5a4 4 0 0 1 8 0v2" />
                </svg>
              </div>
              <div>
                <h3>Marca própria (Private Label)</h3>
                <p>O protocolo chega com a identidade visual da sua farmácia: embalagem, posicionamento e material exclusivos. Você constrói um ativo, não revende um produto.</p>
              </div>
            </div>
            <div className="bullet">
              <div className="ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
                </svg>
              </div>
              <div>
                <h3>Faturamento recorrente</h3>
                <p>Cada paciente que inicia uma caneta é um futuro candidato à fase de manutenção. Produto exclusivo permite margens superiores e recompra contínua.</p>
              </div>
            </div>
            <div className="bullet">
              <div className="ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h3>Captação de prescritores</h3>
                <p>Médicos e nutricionistas ganham um diferencial exclusivo para oferecer aos pacientes — gerando novas prescrições direcionadas ao seu balcão.</p>
              </div>
            </div>
            <div className="bullet">
              <div className="ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h3>Proteção contra guerra de preços</h3>
                <p>Protocolo exclusivo na região não é comparável no Google. A disputa deixa de ser por centavos e passa a ser por posicionamento.</p>
              </div>
            </div>
            <div className="bullet">
              <div className="ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" />
                </svg>
              </div>
              <div>
                <h3>Fidelização de pacientes</h3>
                <p>Quem mantém o resultado volta, recompra e indica. A farmácia passa a acompanhar a fase mais duradoura da jornada — não só o início.</p>
              </div>
            </div>
            <div className="bullet">
              <div className="ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8M12 18v3" />
                </svg>
              </div>
              <div>
                <h3>Material técnico e comercial pronto</h3>
                <p>Você recebe apoio de marketing completo para apresentar o protocolo a prescritores e pacientes, sem partir do zero.</p>
              </div>
            </div>
            <div className="bullet">
              <div className="ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div>
                <h3>Referência regional em manutenção</h3>
                <p>Sua farmácia deixa de ser vista apenas como manipuladora e se torna referência no pós-tratamento — atraindo pacientes de cidades vizinhas.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq">
        <div className="wrap">
          <div className="section-header">
            <div className="eyebrow">Dúvidas principais</div>
            <h2>Perguntas frequentes</h2>
            <p className="sub">As 7 principais respostas antes da conversa com nossa equipe.</p>
          </div>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <div className="faq-item" key={i}>
                <button className="faq-q" aria-expanded="false">
                  <span style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <span className="idx">{i + 1}</span>
                    <span className="txt">{item.q}</span>
                  </span>
                  <span className="chev">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </button>
                <div className="faq-a">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="cta-block">
            <a className="btn btn-green" href="#contato">QUERO SABER MAIS</a>
            <p className="cta-note">Uma farmácia por município · disponibilidade sujeita a alteração</p>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="depoimentos">
        <div className="wrap">
          <div className="section-header">
            <div className="eyebrow">Quem já credenciou</div>
            <h2>O que dizem as farmácias parceiras</h2>
            <p className="sub">Depoimentos de quem já atende a fase da manutenção com o TCF-4.</p>
          </div>
          <div className="depo-grid">
            {TESTIMONIALS.map((d, i) => (
              <div className="depo" key={i}>
                <div className="stars">★★★★★</div>
                <p>{d.text}</p>
                <div className="who">
                  <div className="avatar">FN</div>
                  <div className="info">
                    <strong>Farmácia [Nome]</strong>
                    <span>{d.role} · [Cidade/UF]</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="about" id="quem-somos">
        <div className="wrap">
          <div className="section-header">
            <div className="eyebrow">Quem somos</div>
            <h2>A autoridade técnica por trás do TCF-4</h2>
            <p className="sub">Duas empresas consolidadas no mercado magistral brasileiro, unidas por um protocolo exclusivo.</p>
          </div>
          <div className="about-grid">
            <div className="about-card">
              <span className="company-mark">R7 do Brasil</span>
              <h3>Importação e distribuição de ingredientes de alta qualidade</h3>
              <p>
                Empresa consolidada no mercado magistral brasileiro, especializada na importação e distribuição de
                ingredientes farmacêuticos e nutracêuticos de alta qualidade. Responsável pela introdução no país de
                diversos ativos inovadores, além de um amplo portfólio de commodities farmacêuticas.
              </p>
              <div className="actives">
                <span>SODMAX</span>
                <span>MoroOrange</span>
                <span>Silex-Si</span>
                <span>Skin Beauty</span>
                <span>3Joint</span>
                <span>Coenzima Q10</span>
                <span>Resveratrol</span>
              </div>
            </div>
            <div className="about-card">
              <span className="company-mark">D7 Pharma do Brasil</span>
              <h3>Desenvolvimento de formulações inovadoras</h3>
              <p>
                Expertise no desenvolvimento de formulações inovadoras, transformando ingredientes de alta qualidade em
                soluções voltadas à saúde e ao bem-estar — sempre alinhadas às melhores práticas de desenvolvimento de
                suplementos e ao rigor técnico exigido pelo mercado magistral.
              </p>
            </div>
          </div>
          <div className="about-merge">
            Da combinação entre a experiência da <strong>R7 do Brasil</strong> em ativos inovadores e a capacidade de
            desenvolvimento da <strong>D7 Pharma do Brasil</strong> nasceu o TCF-4: um protocolo construído sobre
            conhecimento científico, vivência real no mercado magistral e compromisso com inovação e qualidade.
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="contact" id="contato">
        <div className="wrap">
          <div className="section-header">
            <div className="eyebrow">Fale conosco</div>
            <h2>Verifique a disponibilidade da sua cidade</h2>
            <p className="sub">
              É apenas <strong>uma farmácia de manipulação por município</strong>. Fale agora com nossa equipe pelo
              WhatsApp e confirme se a exclusividade da sua região ainda está aberta.
            </p>
          </div>
          <button className="btn btn-wa" onClick={openModal}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .5C5.7.5.7 5.5.7 11.8c0 2 .5 3.9 1.5 5.6L.6 23.5l6.3-1.6c1.6.9 3.4 1.4 5.2 1.4 6.3 0 11.3-5 11.3-11.3S18.3.5 12 .5zm0 20.6c-1.6 0-3.2-.4-4.6-1.3l-.3-.2-3.7 1 1-3.6-.2-.3a9.2 9.2 0 0 1-1.4-4.9c0-5.1 4.1-9.2 9.2-9.2s9.2 4.1 9.2 9.2-4.1 9.3-9.2 9.3zm5-6.9c-.3-.1-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1a7.5 7.5 0 0 1-3.7-3.2c-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-.8-2c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 1.9 2.9 4.6 4.1 1.7.7 2.4.8 3.2.7.5-.1 1.6-.6 1.8-1.2.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z" />
            </svg>
            FALAR NO WHATSAPP
          </button>
          <p className="cta-note">Resposta em horário comercial · Segunda a sexta</p>
        </div>
      </section>

      {/* MODAL LEAD */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className="modal-close" onClick={closeModal} aria-label="Fechar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="modal-head">
              <div className="eyebrow">Exclusividade TCF-4</div>
              <h3 id="modal-title">Verifique a disponibilidade da sua cidade</h3>
              <p>Preencha os dados abaixo e nossa equipe entrará em contato pelo WhatsApp.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="lp-nome">Nome *</label>
                  <input
                    id="lp-nome" name="nome" type="text"
                    placeholder="Seu nome" required
                    value={form.nome} onChange={handleChange}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="lp-sobrenome">Sobrenome *</label>
                  <input
                    id="lp-sobrenome" name="sobrenome" type="text"
                    placeholder="Seu sobrenome" required
                    value={form.sobrenome} onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="lp-email">E-mail *</label>
                <input
                  id="lp-email" name="email" type="email"
                  placeholder="seuemail@exemplo.com.br" required
                  value={form.email} onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label htmlFor="lp-whatsapp">WhatsApp *</label>
                <input
                  id="lp-whatsapp" name="whatsapp" type="tel"
                  placeholder="(00) 00000-0000" required
                  value={form.whatsapp} onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label htmlFor="lp-perfil">Você é *</label>
                <select
                  id="lp-perfil" name="perfil" required
                  value={form.perfil} onChange={handleChange}
                >
                  <option value="">Selecione seu perfil</option>
                  {PERFIL_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="lp-cidade">Cidade *</label>
                  <input
                    id="lp-cidade" name="cidade" type="text"
                    placeholder="Sua cidade" required
                    value={form.cidade} onChange={handleChange}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="lp-estado">Estado *</label>
                  <select
                    id="lp-estado" name="estado" required
                    value={form.estado} onChange={handleChange}
                  >
                    <option value="">UF</option>
                    {BR_STATES.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-modal-wa">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .5C5.7.5.7 5.5.7 11.8c0 2 .5 3.9 1.5 5.6L.6 23.5l6.3-1.6c1.6.9 3.4 1.4 5.2 1.4 6.3 0 11.3-5 11.3-11.3S18.3.5 12 .5zm0 20.6c-1.6 0-3.2-.4-4.6-1.3l-.3-.2-3.7 1 1-3.6-.2-.3a9.2 9.2 0 0 1-1.4-4.9c0-5.1 4.1-9.2 9.2-9.2s9.2 4.1 9.2 9.2-4.1 9.3-9.2 9.3zm5-6.9c-.3-.1-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1a7.5 7.5 0 0 1-3.7-3.2c-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-.8-2c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 1.9 2.9 4.6 4.1 1.7.7 2.4.8 3.2.7.5-.1 1.6-.6 1.8-1.2.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z" />
                </svg>
                CONTINUAR NO WHATSAPP
              </button>

              <p className="modal-legal">
                Ao continuar, você será direcionado ao WhatsApp para falar com nossa equipe.<br />
                Seus dados são usados exclusivamente para contato comercial.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div>
              <div className="brand-foot">
                <img src="/logo-d7-pharma.png" alt="D7 Pharma" />
              </div>
              <p className="disc">
                O TCF-4 é um protocolo nutricional voltado ao suporte da fase de manutenção após o tratamento para
                controle de peso, e deve ser associado a alimentação equilibrada, atividade física e acompanhamento
                profissional. Não substitui a medicação nem a orientação médica ou nutricional. Dados de mercado são
                estimativas baseadas em relatórios e projeções do setor.
              </p>
            </div>
            <div>
              <p style={{ color: "#B8CAE0", fontWeight: 700, marginBottom: ".8rem", fontSize: ".85rem" }}>
                TCF-4 · Protocolo de Manutenção Pós-GLP-1
              </p>
              <p style={{ lineHeight: 1.75 }}>
                Desenvolvido por <strong style={{ color: "#fff" }}>D7 Pharma do Brasil</strong>
                <br />
                em parceria com <strong style={{ color: "#fff" }}>R7 do Brasil</strong>
              </p>
            </div>
          </div>
          <div className="foot-row">
            <span>© 2026 D7 Pharma do Brasil · R7 do Brasil — Todos os direitos reservados.</span>
            <span>www.d7pharmabrazil.com.br</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
