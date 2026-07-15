import{r as i,j as e}from"./vendor-react-S44IyOkZ.js";import{b as y,s as N}from"./index-CocVPakQ.js";import"./vendor-query-uNrepy2-.js";import"./vendor-motion-DTuUg3eu.js";const k=`
  .lpv2{
    --ink:#0A2E23;
    --forest-deep:#0F4838;
    --forest-deepest:#072019;
    --paper:#F4F9F5;
    --white:#FFFFFF;
    --emerald:#10B981;
    --emerald-dark:#059669;
    --emerald-soft:#D9F0E6;
    --whatsapp:#25D366;
    --whatsapp-dark:#1EB855;
    --line:#D4E4DA;
    --muted:#4E6A62;
    --radius:14px;
    --wrap:1120px;
    font-family:'Figtree',system-ui,sans-serif;
    color:var(--ink);
    background:var(--paper);
    line-height:1.6;
    -webkit-font-smoothing:antialiased;
  }
  .lpv2 *{margin:0;padding:0;box-sizing:border-box}
  .lpv2 .wrap{max-width:var(--wrap);margin:0 auto;padding:0 24px}
  .lpv2 .mono{font-family:'IBM Plex Mono',monospace}
  .lpv2 .eyebrow{
    font-family:'IBM Plex Mono',monospace;
    font-size:.72rem;font-weight:600;
    letter-spacing:.16em;text-transform:uppercase;
    color:var(--emerald-dark);
  }
  .lpv2 .eyebrow.on-dark{color:#7FE0C0}
  .lpv2 h1,.lpv2 h2,.lpv2 h3{font-family:'Archivo',sans-serif;line-height:1.12;letter-spacing:-.015em}
  .lpv2 h2{font-size:clamp(1.7rem,3.4vw,2.4rem);font-weight:800;margin:.55rem 0 1rem}
  .lpv2 section{padding:84px 0}
  @media(max-width:720px){.lpv2 section{padding:60px 0}}

  /* topbar */
  .lpv2 .topbar{
    position:sticky;top:0;z-index:50;
    background:rgba(244,249,245,.92);backdrop-filter:blur(10px);
    border-bottom:1px solid var(--line);
  }
  .lpv2 .topbar .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
  .lpv2 .brand{display:flex;align-items:baseline;gap:.6rem}
  .lpv2 .brand strong{font-family:'Archivo';font-weight:900;font-size:1.25rem;letter-spacing:-.02em}
  .lpv2 .brand strong em{font-style:normal;color:var(--emerald-dark)}
  .lpv2 .brand span{font-family:'IBM Plex Mono',monospace;font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .lpv2 .top-cta{
    font-weight:700;font-size:.85rem;text-decoration:none;color:var(--forest-deep);
    border:1.5px solid var(--forest-deep);border-radius:99px;padding:.5rem 1.1rem;
    transition:.2s;cursor:pointer;background:none;font-family:'Figtree',sans-serif;
  }
  .lpv2 .top-cta:hover{background:var(--forest-deep);color:#fff}
  @media(max-width:640px){.lpv2 .brand span{display:none}}

  /* hero */
  .lpv2 .hero{
    background:linear-gradient(180deg,var(--forest-deepest) 0%,var(--forest-deep) 100%);
    color:#DDF0E7;padding:88px 0 72px;position:relative;overflow:hidden;
  }
  .lpv2 .hero::after{
    content:"";position:absolute;inset:0;pointer-events:none;
    background:
      radial-gradient(720px 340px at 85% -10%,rgba(16,185,129,.14),transparent 60%),
      radial-gradient(600px 300px at 0% 110%,rgba(16,185,129,.22),transparent 60%);
  }
  .lpv2 .hero .wrap{position:relative;z-index:1}
  .lpv2 .hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:56px;align-items:center}
  @media(max-width:900px){.lpv2 .hero-grid{grid-template-columns:1fr}}
  .lpv2 .hero h1{
    font-size:clamp(2rem,4.6vw,3.15rem);font-weight:900;color:#fff;
    margin:.9rem 0 1.1rem;
  }
  .lpv2 .hero h1 .hl{color:var(--emerald)}
  .lpv2 .hero p.lead{font-size:1.08rem;color:#B7D1C7;max-width:34rem}
  .lpv2 .hero-tags{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.6rem}
  .lpv2 .hero-tags span{
    font-family:'IBM Plex Mono',monospace;font-size:.68rem;letter-spacing:.08em;
    border:1px solid rgba(255,255,255,.22);border-radius:99px;
    padding:.38rem .85rem;color:#CFE6DC;
  }

  /* seal */
  .lpv2 .seal-wrap{display:flex;justify-content:center}
  .lpv2 .seal{
    position:relative;width:min(300px,70vw);aspect-ratio:1/1;
    display:flex;align-items:center;justify-content:center;
  }
  .lpv2 .seal .spin-svg{position:absolute;inset:0;width:100%;height:100%;animation:lpv2Spin 26s linear infinite}
  @media(prefers-reduced-motion:reduce){.lpv2 .seal .spin-svg{animation:none}}
  @keyframes lpv2Spin{to{transform:rotate(360deg)}}
  .lpv2 .seal-core{
    width:62%;aspect-ratio:1/1;border-radius:50%;
    background:radial-gradient(circle at 32% 28%,#123f33,var(--forest-deepest));
    border:1.5px solid rgba(16,185,129,.55);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;gap:.15rem;padding:1rem;
    box-shadow:0 24px 60px rgba(0,0,0,.4);
  }
  .lpv2 .seal-core .n{font-family:'Archivo';font-weight:900;font-size:3.4rem;color:var(--emerald);line-height:1}
  .lpv2 .seal-core .t{font-family:'IBM Plex Mono',monospace;font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:#B7D1C7}

  /* botões */
  .lpv2 .btn{
    display:inline-flex;align-items:center;justify-content:center;gap:.6rem;
    font-family:'Archivo',sans-serif;font-weight:800;font-size:1rem;letter-spacing:.01em;
    text-decoration:none;border-radius:99px;padding:1.05rem 2.2rem;
    transition:transform .15s,box-shadow .15s,background .15s;cursor:pointer;border:none;
  }
  .lpv2 .btn:focus-visible{outline:3px solid var(--emerald);outline-offset:3px}
  .lpv2 .btn-emerald{background:var(--emerald);color:#fff;box-shadow:0 10px 28px rgba(16,185,129,.35)}
  .lpv2 .btn-emerald:hover{transform:translateY(-2px);background:var(--emerald-dark);box-shadow:0 14px 34px rgba(16,185,129,.45)}
  .lpv2 .btn-wa{background:var(--whatsapp);color:#fff;box-shadow:0 10px 28px rgba(37,211,102,.3)}
  .lpv2 .btn-wa:hover{transform:translateY(-2px);background:var(--whatsapp-dark)}
  .lpv2 .cta-block{text-align:center;margin-top:2.2rem}
  .lpv2 .cta-note{font-size:.82rem;color:var(--muted);margin-top:.7rem}
  .lpv2 .cta-note.on-dark{color:#9DBBB4}

  /* CTA blink */
  @keyframes lpv2Blink{
    0%,100%{box-shadow:0 10px 28px rgba(16,185,129,.35);background:var(--emerald);transform:scale(1)}
    50%{box-shadow:0 18px 48px rgba(16,185,129,.75);background:var(--emerald-dark);transform:scale(1.06)}
  }
  .lpv2 .btn-blink{animation:lpv2Blink 1.1s ease-in-out infinite}

  /* vsl */
  .lpv2 .vsl{background:var(--forest-deep);color:#DDF0E7;padding:0 0 76px;margin-top:-1px}
  .lpv2 .video-wrapper{
    position:relative;border-radius:var(--radius);overflow:hidden;
    max-width:880px;margin:0 auto;
    background:#000;
    border:1px solid rgba(255,255,255,.14);
    box-shadow:0 30px 80px rgba(0,0,0,.45);
    aspect-ratio:16/9;
  }
  .lpv2 .video-wrapper iframe{
    position:absolute;inset:0;
    width:100%;height:100%;
    border:0;
  }

  /* data strip */
  .lpv2 .data-strip{background:var(--forest-deepest);color:#fff;padding:34px 0;border-top:1px solid rgba(255,255,255,.08)}
  .lpv2 .data-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;text-align:center}
  @media(max-width:820px){.lpv2 .data-grid{grid-template-columns:repeat(2,1fr);gap:28px}}
  .lpv2 .data-grid .v{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:clamp(1.4rem,2.6vw,1.9rem);color:var(--emerald)}
  .lpv2 .data-grid .l{font-size:.78rem;color:#9DBBB4;margin-top:.25rem}
  .lpv2 .data-src{text-align:center;font-size:.68rem;color:#4E7069;margin-top:1.4rem;font-family:'IBM Plex Mono',monospace}

  /* bullets */
  .lpv2 .bullets-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-top:2rem}
  @media(max-width:760px){.lpv2 .bullets-grid{grid-template-columns:1fr}}
  .lpv2 .bullet{
    background:var(--white);border:1px solid var(--line);border-radius:var(--radius);
    padding:1.5rem 1.6rem;display:flex;gap:1rem;align-items:flex-start;
  }
  .lpv2 .bullet .ic{
    flex:0 0 40px;height:40px;border-radius:10px;background:var(--emerald-soft);
    display:flex;align-items:center;justify-content:center;color:var(--emerald-dark);
  }
  .lpv2 .bullet.featured .ic{background:var(--emerald);color:#fff}
  .lpv2 .bullet h3{font-size:1.02rem;font-weight:800;margin-bottom:.3rem}
  .lpv2 .bullet p{font-size:.92rem;color:var(--muted)}

  /* faq */
  .lpv2 .faq{background:var(--white);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .lpv2 .faq-list{max-width:820px;margin:2rem auto 0}
  .lpv2 .faq-item{border-bottom:1px solid var(--line)}
  .lpv2 .faq-q{
    width:100%;background:none;border:none;text-align:left;cursor:pointer;
    display:flex;justify-content:space-between;align-items:center;gap:1rem;
    padding:1.25rem .2rem;font-family:'Archivo';font-weight:700;font-size:1.02rem;color:var(--ink);
  }
  .lpv2 .faq-q .idx{font-family:'IBM Plex Mono',monospace;font-size:.72rem;color:var(--emerald-dark);margin-right:.8rem}
  .lpv2 .faq-q .chev{flex:0 0 auto;transition:transform .25s;color:var(--emerald-dark)}
  .lpv2 .faq-item.open .chev{transform:rotate(180deg)}
  .lpv2 .faq-a{max-height:0;overflow:hidden;transition:max-height .3s ease}
  .lpv2 .faq-a p{padding:0 .2rem 1.3rem;color:var(--muted);font-size:.95rem;max-width:44rem}

  /* depoimentos */
  .lpv2 .depo-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-top:2rem}
  @media(max-width:760px){.lpv2 .depo-grid{grid-template-columns:1fr}}
  .lpv2 .depo{
    background:var(--white);border:1px solid var(--line);border-radius:var(--radius);
    padding:1.7rem;position:relative;
  }
  .lpv2 .depo::before{
    content:"\\201C";font-family:'Archivo';font-weight:900;font-size:3rem;color:var(--emerald);
    position:absolute;top:.6rem;left:1.3rem;line-height:1;opacity:.9;
  }
  .lpv2 .depo p{margin-top:1.6rem;font-size:.95rem;color:var(--ink)}
  .lpv2 .depo .who{margin-top:1.1rem;display:flex;flex-direction:column}
  .lpv2 .depo .who strong{font-size:.88rem}
  .lpv2 .depo .who span{font-family:'IBM Plex Mono',monospace;font-size:.68rem;letter-spacing:.08em;color:var(--muted);text-transform:uppercase}

  /* quem somos */
  .lpv2 .about{background:var(--forest-deep);color:#DCEEE5}
  .lpv2 .about h2{color:#fff}
  .lpv2 .about-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:2rem}
  @media(max-width:820px){.lpv2 .about-grid{grid-template-columns:1fr}}
  .lpv2 .about-card{
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);
    border-radius:var(--radius);padding:1.8rem;
  }
  .lpv2 .about-card h3{color:var(--emerald);font-size:1.15rem;margin-bottom:.6rem}
  .lpv2 .about-card p{font-size:.93rem;color:#BED8CD}
  .lpv2 .about-merge{
    margin-top:20px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.4);
    border-radius:var(--radius);padding:1.6rem 1.8rem;font-size:.97rem;color:#D6EFDF;
  }
  .lpv2 .actives{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:1rem}
  .lpv2 .actives span{
    font-family:'IBM Plex Mono',monospace;font-size:.64rem;letter-spacing:.06em;
    border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:.3rem .6rem;color:#CFE6DC;
  }

  /* contato */
  .lpv2 .contact{text-align:center}
  .lpv2 .contact p.sub{max-width:32rem;margin:0 auto;color:var(--muted)}
  .lpv2 .contact-info{
    display:inline-flex;align-items:center;gap:.6rem;
    margin-top:1.5rem;font-family:'IBM Plex Mono',monospace;
    font-size:.85rem;color:var(--forest-deep);font-weight:600;letter-spacing:.05em;
  }

  /* footer */
  .lpv2 footer{background:var(--forest-deepest);color:#7EA097;padding:44px 0;font-size:.76rem}
  .lpv2 footer .disc{max-width:56rem;line-height:1.7}
  .lpv2 footer .foot-row{display:flex;justify-content:space-between;gap:2rem;flex-wrap:wrap;margin-top:1.6rem;padding-top:1.4rem;border-top:1px solid rgba(255,255,255,.08)}

  /* MODAL */
  .lpv2 .modal-overlay{
    position:fixed;inset:0;
    background:rgba(7,32,25,.7);backdrop-filter:blur(5px);
    z-index:200;display:flex;align-items:center;justify-content:center;
    padding:20px;animation:lpv2FadeIn .18s ease;
  }
  @keyframes lpv2FadeIn{from{opacity:0}to{opacity:1}}
  .lpv2 .modal{
    background:#fff;border-radius:20px;
    padding:2.2rem 2rem 2rem;
    max-width:540px;width:100%;
    max-height:92vh;overflow-y:auto;
    box-shadow:0 40px 100px rgba(7,32,25,.4);
    position:relative;animation:lpv2SlideUp .22s ease;
  }
  @keyframes lpv2SlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .lpv2 .modal-close{
    position:absolute;top:1rem;right:1rem;
    width:36px;height:36px;border-radius:50%;
    border:1px solid var(--line);background:var(--paper);
    cursor:pointer;display:flex;align-items:center;justify-content:center;
    color:var(--muted);transition:.15s;
  }
  .lpv2 .modal-close:hover{background:var(--line);color:var(--ink)}
  .lpv2 .modal-head{margin-bottom:1.4rem}
  .lpv2 .modal-head .eyebrow{margin-bottom:.4rem}
  .lpv2 .modal-head h3{font-size:1.35rem;color:var(--ink);margin-bottom:.3rem;font-family:'Archivo';font-weight:800}
  .lpv2 .modal-head p{font-size:.88rem;color:var(--muted);line-height:1.5}
  .lpv2 .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:480px){.lpv2 .form-row{grid-template-columns:1fr}}
  .lpv2 .form-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
  .lpv2 .form-field label{
    font-size:.72rem;font-weight:700;color:var(--ink);
    letter-spacing:.06em;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;
  }
  .lpv2 .form-field input,
  .lpv2 .form-field select{
    height:48px;border:1.5px solid var(--line);border-radius:10px;
    padding:0 14px;font-family:'Figtree',sans-serif;
    font-size:.95rem;color:var(--ink);background:var(--paper);
    transition:border-color .15s,background .15s;outline:none;
    appearance:none;-webkit-appearance:none;
  }
  .lpv2 .form-field select{
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%234E6A62' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 14px center;
    padding-right:36px;cursor:pointer;
  }
  .lpv2 .form-field input:focus,
  .lpv2 .form-field select:focus{border-color:var(--emerald);background:#fff}
  .lpv2 .form-field input::placeholder{color:#9DBBB4}
  .lpv2 .btn-modal-wa{
    width:100%;margin-top:6px;
    background:var(--whatsapp);color:#fff;
    padding:1.05rem;border-radius:99px;
    font-family:'Archivo',sans-serif;font-size:1rem;font-weight:800;
    border:none;cursor:pointer;
    display:flex;align-items:center;justify-content:center;gap:.6rem;
    transition:background .15s,transform .15s;
    box-shadow:0 8px 24px rgba(37,211,102,.3);
  }
  .lpv2 .btn-modal-wa:hover{background:var(--whatsapp-dark);transform:translateY(-1px)}
  .lpv2 .modal-legal{
    text-align:center;font-size:.72rem;color:var(--muted);
    margin-top:1rem;line-height:1.5;
  }

  /* MOBILE STICKY CTA */
  .lpv2 .mobile-cta{
    position:fixed;bottom:0;left:0;right:0;z-index:100;
    background:var(--forest-deepest);padding:14px 20px;
    box-shadow:0 -4px 20px rgba(7,32,25,.4);
    border-top:2px solid var(--emerald);
    display:flex;align-items:center;justify-content:center;gap:12px;
  }
  @media(min-width:761px){.lpv2 .mobile-cta{display:none}}
  .lpv2 .mobile-cta p{font-size:.75rem;color:#9DBBB4;line-height:1.4;flex:1;min-width:0;margin:0}
  .lpv2 .mobile-cta .btn-mc{
    flex:0 0 auto;
    background:var(--whatsapp);color:#fff;
    padding:.7rem 1.3rem;border-radius:99px;
    font-family:'Archivo',sans-serif;font-size:.88rem;font-weight:800;
    border:none;cursor:pointer;white-space:nowrap;
    display:flex;align-items:center;gap:.5rem;
    box-shadow:0 6px 18px rgba(37,211,102,.4);
  }
`,C=[{idx:"01",q:"O que é, exatamente, o TCF-4?",a:'O TCF-4 é um protocolo nutricional desenvolvido para oferecer suporte durante a fase de manutenção dos resultados, após o tratamento para controle de peso com agonistas de GLP-1 (as "canetas"). Ele foi pensado para o momento do desmame — sempre associado a alimentação equilibrada, atividade física e acompanhamento profissional.'},{idx:"02",q:"O TCF-4 substitui as canetas ou a medicação?",a:"Não. O TCF-4 não é medicamento e não se apresenta, em nenhum momento, como substituto da medicação ou da orientação médica. Ele atua exclusivamente como suporte nutricional na fase de manutenção, dentro das boas práticas regulatórias do mercado magistral."},{idx:"03",q:"Como funciona a exclusividade territorial?",a:"Em cada município, credenciamos apenas uma farmácia de manipulação (e uma clínica médica). Enquanto o contrato estiver vigente, nenhuma outra farmácia da cidade poderá comercializar o protocolo TCF-4. As cidades são credenciadas conforme disponibilidade — e cada cidade fechada é uma vaga que não volta."},{idx:"04",q:"Como funciona a marca própria (Private Label)?",a:"O protocolo é comercializado com a identidade visual da sua farmácia: embalagem personalizada, material técnico e comercial exclusivo, estratégia de posicionamento e suporte para implantação na sua rotina. Você não compra um produto de terceiros — constrói um ativo com o nome da sua farmácia."},{idx:"05",q:"Quem desenvolve e respalda o protocolo?",a:"O TCF-4 nasce da união entre a R7 do Brasil — referência na importação e distribuição de ativos farmacêuticos e nutracêuticos como SODMAX, MoroOrange, Silex-Si, Skin Beauty e 3Joint — e a D7 Pharma do Brasil, especializada no desenvolvimento de formulações inovadoras. Empresas que já fazem parte do dia a dia do mercado magistral brasileiro."},{idx:"06",q:"Que apoio de marketing e vendas eu recebo?",a:"A farmácia credenciada recebe materiais técnicos e comerciais prontos para apresentação do protocolo a prescritores e pacientes, além de estratégia de posicionamento e suporte na implantação — facilitando a captação de médicos, nutricionistas e a divulgação local."},{idx:"07",q:"Como sei se a minha cidade ainda está disponível?",a:"Clique em qualquer botão desta página e fale com a nossa equipe pelo WhatsApp. Verificamos na hora se a exclusividade do seu município ainda está aberta e apresentamos os próximos passos para desenvolver o TCF-4 com a identidade da sua farmácia."}],E=[{text:"Atendíamos dezenas de receitas de caneta por semana e perdíamos o paciente logo depois do tratamento. Com o TCF-4, a fase de manutenção virou a nossa maior fonte de recompra.",role:"Farmacêutica responsável"},{text:"O que mais nos convenceu foi a marca própria. Não estamos vendendo o produto de outra empresa — estamos construindo o nosso protocolo, com exclusividade na cidade.",role:"Sócio-proprietário"},{text:"Os prescritores da região abraçaram rápido. Ter um protocolo exclusivo para o pós-desmame virou argumento de visita: hoje recebemos prescrições que antes não existiam.",role:"Diretora técnica"},{text:"Trabalhar com respaldo da R7 e da D7 Pharma fez diferença: ativos que já conhecíamos, material técnico pronto e suporte real na implantação. Foi plug and play.",role:"Farmacêutico responsável"}],A="5547996919986",M=["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"],F=["Proprietário de uma Farmácia","Farmacêutico","Médico","Profissional da Área da Saúde","Outro"],m=({size:l=22})=>e.jsx("svg",{width:l,height:l,viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M12 .5C5.7.5.7 5.5.7 11.8c0 2 .5 3.9 1.5 5.6L.6 23.5l6.3-1.6c1.6.9 3.4 1.4 5.2 1.4 6.3 0 11.3-5 11.3-11.3S18.3.5 12 .5zm0 20.6c-1.6 0-3.2-.4-4.6-1.3l-.3-.2-3.7 1 1-3.6-.2-.3a9.2 9.2 0 0 1-1.4-4.9c0-5.1 4.1-9.2 9.2-9.2s9.2 4.1 9.2 9.2-4.1 9.3-9.2 9.3zm5-6.9c-.3-.1-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1a7.5 7.5 0 0 1-3.7-3.2c-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-.8-2c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 1.9 2.9 4.6 4.1 1.7.7 2.4.8 3.2.7.5-.1 1.6-.6 1.8-1.2.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z"})});function P(){const{tenantId:l}=y(),[d,h]=i.useState(!1),[r,v]=i.useState({nome:"",sobrenome:"",email:"",whatsapp:"",perfil:"",cidade:"",estado:""}),[u,f]=i.useState(!1),[g,b]=i.useState(!1);function n(){h(!0)}function c(){h(!1)}function s(a){v(o=>({...o,[a.target.name]:a.target.value}))}function j(a){a.preventDefault(),N.from("popup_leads").insert({name:`${r.nome} ${r.sobrenome}`.trim(),email:r.email,phone:r.whatsapp,city:r.cidade,state:r.estado,source:`lp-farmacias-v2 | ${r.perfil}`,tags:[],tenant_id:l});const o=encodeURIComponent(`Olá! Tenho uma farmácia de manipulação e quero verificar a disponibilidade do TCF-4 na minha cidade.

👤 Nome: ${r.nome} ${r.sobrenome}
📧 E-mail: ${r.email}
📱 WhatsApp: ${r.whatsapp}
🏷️ Perfil: ${r.perfil}
📍 Cidade/UF: ${r.cidade}/${r.estado}`);window.open(`https://wa.me/${A}?text=${o}`,"_blank","noopener,noreferrer"),c()}return i.useEffect(()=>(document.body.style.overflow=d?"hidden":"",()=>{document.body.style.overflow=""}),[d]),i.useEffect(()=>{const a=document.title;return document.title="TCF-4 · Exclusividade para Farmácias de Manipulação | D7 Pharma do Brasil",()=>{document.title=a}},[]),i.useEffect(()=>{const a=[Object.assign(document.createElement("link"),{rel:"preconnect",href:"https://fonts.googleapis.com"}),Object.assign(document.createElement("link"),{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"}),Object.assign(document.createElement("link"),{rel:"stylesheet",href:"https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800;900&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"})];return a.forEach(o=>document.head.appendChild(o)),()=>a.forEach(o=>o.remove())},[]),i.useEffect(()=>{const a=setTimeout(()=>f(!0),24e4);return()=>clearTimeout(a)},[]),i.useEffect(()=>{const a=setTimeout(()=>b(!0),12e4);return()=>clearTimeout(a)},[]),i.useEffect(()=>{function a(){const t=this.closest(".faq-item"),x=t.querySelector(".faq-a"),w=t.classList.contains("open");document.querySelectorAll(".lpv2 .faq-item.open").forEach(p=>{p.classList.remove("open"),p.querySelector(".faq-a").style.maxHeight="",p.querySelector(".faq-q").setAttribute("aria-expanded","false")}),w||(t.classList.add("open"),x.style.maxHeight=x.scrollHeight+"px",this.setAttribute("aria-expanded","true"))}const o=Array.from(document.querySelectorAll(".lpv2 .faq-q"));return o.forEach(t=>t.addEventListener("click",a)),()=>o.forEach(t=>t.removeEventListener("click",a))},[]),e.jsxs("div",{className:"lpv2",children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:k}}),e.jsx("div",{className:"topbar",children:e.jsxs("div",{className:"wrap",children:[e.jsxs("div",{className:"brand",children:[e.jsxs("strong",{children:["TCF",e.jsx("em",{children:"-4"})]}),e.jsx("span",{children:"D7 Pharma do Brasil · R7 do Brasil"})]}),e.jsx("button",{className:"top-cta",onClick:n,children:"Verificar minha cidade"})]})}),e.jsx("header",{className:"hero",children:e.jsxs("div",{className:"wrap hero-grid",children:[e.jsxs("div",{children:[e.jsx("div",{className:"eyebrow on-dark",children:"Protocolo de manutenção pós-GLP-1 · Marca própria"}),e.jsxs("h1",{children:["O tratamento com as canetas termina.",e.jsx("br",{}),e.jsx("span",{className:"hl",children:"Quem vai atender o paciente depois: a sua farmácia — ou a concorrente?"})]}),e.jsxs("p",{className:"lead",children:["O TCF-4 é o protocolo nutricional de suporte à fase de manutenção dos resultados após o tratamento com agonistas de GLP-1 — licenciado com a ",e.jsx("strong",{children:"sua marca"})," e com"," ",e.jsx("strong",{children:"exclusividade territorial: apenas 1 farmácia de manipulação por cidade"}),"."]}),e.jsxs("div",{className:"hero-tags",children:[e.jsx("span",{children:"PRIVATE LABEL"}),e.jsx("span",{children:"EXCLUSIVIDADE POR MUNICÍPIO"}),e.jsx("span",{children:"MATERIAL TÉCNICO + COMERCIAL"})]})]}),e.jsx("div",{className:"seal-wrap","aria-hidden":"true",children:e.jsxs("div",{className:"seal",children:[e.jsxs("svg",{className:"spin-svg",viewBox:"0 0 200 200",children:[e.jsx("defs",{children:e.jsx("path",{id:"circv2",d:"M100,100 m-84,0 a84,84 0 1,1 168,0 a84,84 0 1,1 -168,0"})}),e.jsx("text",{fill:"#10B981",fontFamily:"IBM Plex Mono,monospace",fontSize:"10.5",letterSpacing:"3.5",children:e.jsx("textPath",{href:"#circv2",children:"EXCLUSIVIDADE TERRITORIAL · UMA FARMÁCIA POR CIDADE · TCF-4 ·"})})]}),e.jsxs("div",{className:"seal-core",children:[e.jsx("div",{className:"n",children:"1"}),e.jsxs("div",{className:"t",children:["farmácia de manipulação",e.jsx("br",{}),"credenciada por cidade"]})]})]})})]})}),e.jsx("section",{className:"vsl",id:"video",children:e.jsxs("div",{className:"wrap",children:[e.jsx("div",{className:"video-wrapper",children:e.jsx("iframe",{src:"https://www.youtube.com/embed/wh3Xvl72bw8?autoplay=1&mute=1&rel=0&modestbranding=1",title:"TCF-4 · A oportunidade da fase de manutenção pós-GLP-1",allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",allowFullScreen:!0,referrerPolicy:"strict-origin-when-cross-origin"})}),e.jsxs("div",{className:"cta-block",children:[e.jsx("button",{className:`btn btn-emerald${u?" btn-blink":""}`,onClick:n,children:"QUERO SABER MAIS"}),e.jsx("p",{className:"cta-note on-dark",children:"Resposta em horário comercial · verificação de disponibilidade da sua cidade"})]})]})}),e.jsx("div",{className:"data-strip",children:e.jsxs("div",{className:"wrap",children:[e.jsxs("div",{className:"data-grid",children:[e.jsxs("div",{children:[e.jsx("div",{className:"v",children:"R$ 20 bi"}),e.jsx("div",{className:"l",children:"projeção do mercado de GLP-1 no Brasil em 2026"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"v",children:"3–5 mi"}),e.jsx("div",{className:"l",children:"brasileiros usando canetas hoje (estimativa)"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"v",children:"15 mi"}),e.jsx("div",{className:"l",children:"usuários projetados até 2030"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"v",children:"100%"}),e.jsx("div",{className:"l",children:"dos pacientes chegam, em algum momento, ao desmame"})]})]}),e.jsx("div",{className:"data-src",children:"FONTE: RELATÓRIOS E PROJEÇÕES DO SETOR FARMACÊUTICO · VALORES ESTIMADOS"})]})}),e.jsx("section",{id:"vantagens",children:e.jsxs("div",{className:"wrap",children:[e.jsx("div",{className:"eyebrow",children:"Por que fechar a exclusividade"}),e.jsx("h2",{children:"O que a sua farmácia ganha com o TCF-4 em marca própria"}),e.jsxs("div",{className:"bullets-grid",children:[e.jsxs("div",{className:"bullet featured",children:[e.jsx("div",{className:"ic",children:e.jsx("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:e.jsx("path",{d:"M12 2l2.9 6.3 6.6.7-5 4.5 1.4 6.5L12 16.8 6.1 20l1.4-6.5-5-4.5 6.6-.7L12 2z"})})}),e.jsxs("div",{children:[e.jsx("h3",{children:"Exclusividade territorial real"}),e.jsx("p",{children:"Apenas uma farmácia de manipulação credenciada por município. Na sua cidade, ou é você — ou é a concorrente."})]})]}),e.jsxs("div",{className:"bullet featured",children:[e.jsx("div",{className:"ic",children:e.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("rect",{x:"3",y:"7",width:"18",height:"13",rx:"2"}),e.jsx("path",{d:"M8 7V5a4 4 0 0 1 8 0v2"})]})}),e.jsxs("div",{children:[e.jsx("h3",{children:"Marca própria (Private Label)"}),e.jsx("p",{children:"O protocolo chega com a identidade visual da sua farmácia: embalagem, posicionamento e material exclusivos. Você constrói um ativo, não revende um produto."})]})]}),e.jsxs("div",{className:"bullet",children:[e.jsx("div",{className:"ic",children:e.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("path",{d:"M3 17l6-6 4 4 8-8"}),e.jsx("path",{d:"M14 7h7v7"})]})}),e.jsxs("div",{children:[e.jsx("h3",{children:"Faturamento recorrente"}),e.jsx("p",{children:"Cada paciente que inicia uma caneta é um futuro candidato à fase de manutenção. Produto exclusivo permite margens superiores e recompra contínua."})]})]}),e.jsxs("div",{className:"bullet",children:[e.jsx("div",{className:"ic",children:e.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),e.jsx("circle",{cx:"12",cy:"7",r:"4"})]})}),e.jsxs("div",{children:[e.jsx("h3",{children:"Captação de prescritores"}),e.jsx("p",{children:"Médicos e nutricionistas ganham um diferencial exclusivo para oferecer aos pacientes — gerando novas prescrições direcionadas ao seu balcão."})]})]}),e.jsxs("div",{className:"bullet",children:[e.jsx("div",{className:"ic",children:e.jsx("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:e.jsx("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"})})}),e.jsxs("div",{children:[e.jsx("h3",{children:"Proteção contra guerra de preços"}),e.jsx("p",{children:"Protocolo exclusivo na região não é comparável no Google. A disputa deixa de ser por centavos e passa a ser por posicionamento."})]})]}),e.jsxs("div",{className:"bullet",children:[e.jsx("div",{className:"ic",children:e.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("circle",{cx:"12",cy:"12",r:"9"}),e.jsx("path",{d:"M8 12l3 3 5-6"})]})}),e.jsxs("div",{children:[e.jsx("h3",{children:"Fidelização de pacientes"}),e.jsx("p",{children:"Quem mantém o resultado volta, recompra e indica. A farmácia passa a acompanhar a fase mais duradoura da jornada — não só o início."})]})]}),e.jsxs("div",{className:"bullet",children:[e.jsx("div",{className:"ic",children:e.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("rect",{x:"3",y:"4",width:"18",height:"14",rx:"2"}),e.jsx("path",{d:"M8 21h8M12 18v3"})]})}),e.jsxs("div",{children:[e.jsx("h3",{children:"Material técnico e comercial pronto"}),e.jsx("p",{children:"Você recebe apoio de marketing completo para apresentar o protocolo a prescritores e pacientes, sem partir do zero."})]})]}),e.jsxs("div",{className:"bullet",children:[e.jsx("div",{className:"ic",children:e.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[e.jsx("path",{d:"M12 2a10 10 0 1 0 10 10"}),e.jsx("path",{d:"M12 6v6l4 2"})]})}),e.jsxs("div",{children:[e.jsx("h3",{children:"Referência regional em manutenção"}),e.jsx("p",{children:"Sua farmácia deixa de ser vista apenas como manipuladora e se torna referência no pós-tratamento — atraindo pacientes de cidades vizinhas."})]})]})]})]})}),e.jsx("section",{className:"faq",id:"faq",children:e.jsxs("div",{className:"wrap",children:[e.jsx("div",{className:"eyebrow",children:"Dúvidas principais"}),e.jsx("h2",{children:"Perguntas frequentes"}),e.jsx("div",{className:"faq-list",children:C.map(a=>e.jsxs("div",{className:"faq-item",children:[e.jsxs("button",{className:"faq-q","aria-expanded":"false",children:[e.jsxs("span",{children:[e.jsx("span",{className:"idx",children:a.idx}),a.q]}),e.jsx("svg",{className:"chev",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:e.jsx("path",{d:"M6 9l6 6 6-6"})})]}),e.jsx("div",{className:"faq-a",children:e.jsx("p",{children:a.a})})]},a.idx))}),e.jsxs("div",{className:"cta-block",children:[e.jsx("button",{className:"btn btn-emerald",onClick:n,children:"QUERO SABER MAIS"}),e.jsx("p",{className:"cta-note",children:"Uma farmácia por município · disponibilidade sujeita a alteração"})]})]})}),e.jsx("section",{id:"depoimentos",children:e.jsxs("div",{className:"wrap",children:[e.jsx("div",{className:"eyebrow",children:"Quem já credenciou"}),e.jsx("h2",{children:"O que dizem as farmácias parceiras"}),e.jsx("div",{className:"depo-grid",children:E.map((a,o)=>e.jsxs("div",{className:"depo",children:[e.jsx("p",{children:a.text}),e.jsxs("div",{className:"who",children:[e.jsx("strong",{children:"Farmácia [Nome]"}),e.jsxs("span",{children:[a.role," · [Cidade/UF]"]})]})]},o))})]})}),e.jsx("section",{className:"about",id:"quem-somos",children:e.jsxs("div",{className:"wrap",children:[e.jsx("div",{className:"eyebrow on-dark",children:"Quem somos"}),e.jsx("h2",{children:"A autoridade técnica por trás do TCF-4"}),e.jsxs("div",{className:"about-grid",children:[e.jsxs("div",{className:"about-card",children:[e.jsx("h3",{children:"R7 do Brasil"}),e.jsx("p",{children:"Empresa consolidada no mercado magistral brasileiro, especializada na importação e distribuição de ingredientes farmacêuticos e nutracêuticos de alta qualidade."}),e.jsxs("div",{className:"actives",children:[e.jsx("span",{children:"SODMAX"}),e.jsx("span",{children:"MoroOrange"}),e.jsx("span",{children:"Silex-Si"}),e.jsx("span",{children:"Skin Beauty"}),e.jsx("span",{children:"3Joint"}),e.jsx("span",{children:"Coenzima Q10"}),e.jsx("span",{children:"Resveratrol"})]})]}),e.jsxs("div",{className:"about-card",children:[e.jsx("h3",{children:"D7 Pharma do Brasil"}),e.jsx("p",{children:"Expertise no desenvolvimento de formulações inovadoras, transformando ingredientes de alta qualidade em soluções voltadas à saúde e ao bem-estar, com rigor técnico exigido pelo mercado magistral."})]})]}),e.jsxs("div",{className:"about-merge",children:["Da combinação entre a experiência da R7 do Brasil em ativos inovadores e a capacidade de desenvolvimento da D7 Pharma do Brasil nasceu o ",e.jsx("strong",{children:"TCF-4"}),": um protocolo construído sobre conhecimento científico, vivência real no mercado magistral e compromisso com inovação e qualidade."]})]})}),e.jsx("section",{className:"contact",id:"contato",children:e.jsxs("div",{className:"wrap",children:[e.jsx("div",{className:"eyebrow",children:"Fale conosco"}),e.jsx("h2",{children:"Verifique a disponibilidade da sua cidade"}),e.jsxs("p",{className:"sub",children:["É apenas ",e.jsx("strong",{children:"uma farmácia de manipulação por município"}),". Fale agora com a nossa equipe pelo WhatsApp e confirme se a exclusividade da sua região ainda está aberta."]}),e.jsxs("div",{className:"cta-block",children:[e.jsxs("button",{className:"btn btn-wa",onClick:n,children:[e.jsx(m,{}),"FALAR COM A EQUIPE NO WHATSAPP"]}),e.jsxs("div",{className:"contact-info",children:[e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:e.jsx("path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"})}),"(47) 99691-9986 · Balneário Camboriú/SC"]}),e.jsx("p",{className:"cta-note",children:"Resposta em horário comercial · Segunda a sexta"})]})]})}),d&&e.jsx("div",{className:"modal-overlay",onClick:a=>{a.target===a.currentTarget&&c()},children:e.jsxs("div",{className:"modal",role:"dialog","aria-modal":"true","aria-labelledby":"modal-title-v2",children:[e.jsx("button",{className:"modal-close",onClick:c,"aria-label":"Fechar",children:e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",children:e.jsx("path",{d:"M18 6L6 18M6 6l12 12"})})}),e.jsxs("div",{className:"modal-head",children:[e.jsx("div",{className:"eyebrow",children:"Exclusividade TCF-4"}),e.jsx("h3",{id:"modal-title-v2",children:"Verifique a disponibilidade da sua cidade"}),e.jsx("p",{children:"Preencha os dados abaixo e nossa equipe entrará em contato pelo WhatsApp."})]}),e.jsxs("form",{onSubmit:j,noValidate:!0,children:[e.jsxs("div",{className:"form-row",children:[e.jsxs("div",{className:"form-field",children:[e.jsx("label",{htmlFor:"v2-nome",children:"Nome *"}),e.jsx("input",{id:"v2-nome",name:"nome",type:"text",placeholder:"Seu nome",required:!0,value:r.nome,onChange:s})]}),e.jsxs("div",{className:"form-field",children:[e.jsx("label",{htmlFor:"v2-sobrenome",children:"Sobrenome *"}),e.jsx("input",{id:"v2-sobrenome",name:"sobrenome",type:"text",placeholder:"Seu sobrenome",required:!0,value:r.sobrenome,onChange:s})]})]}),e.jsxs("div",{className:"form-field",children:[e.jsx("label",{htmlFor:"v2-email",children:"E-mail *"}),e.jsx("input",{id:"v2-email",name:"email",type:"email",placeholder:"seuemail@exemplo.com.br",required:!0,value:r.email,onChange:s})]}),e.jsxs("div",{className:"form-field",children:[e.jsx("label",{htmlFor:"v2-whatsapp",children:"WhatsApp *"}),e.jsx("input",{id:"v2-whatsapp",name:"whatsapp",type:"tel",placeholder:"(00) 00000-0000",required:!0,value:r.whatsapp,onChange:s})]}),e.jsxs("div",{className:"form-field",children:[e.jsx("label",{htmlFor:"v2-perfil",children:"Você é *"}),e.jsxs("select",{id:"v2-perfil",name:"perfil",required:!0,value:r.perfil,onChange:s,children:[e.jsx("option",{value:"",children:"Selecione seu perfil"}),F.map(a=>e.jsx("option",{value:a,children:a},a))]})]}),e.jsxs("div",{className:"form-row",children:[e.jsxs("div",{className:"form-field",children:[e.jsx("label",{htmlFor:"v2-cidade",children:"Cidade *"}),e.jsx("input",{id:"v2-cidade",name:"cidade",type:"text",placeholder:"Sua cidade",required:!0,value:r.cidade,onChange:s})]}),e.jsxs("div",{className:"form-field",children:[e.jsx("label",{htmlFor:"v2-estado",children:"Estado *"}),e.jsxs("select",{id:"v2-estado",name:"estado",required:!0,value:r.estado,onChange:s,children:[e.jsx("option",{value:"",children:"UF"}),M.map(a=>e.jsx("option",{value:a,children:a},a))]})]})]}),e.jsxs("button",{type:"submit",className:"btn-modal-wa",children:[e.jsx(m,{size:20}),"CONTINUAR NO WHATSAPP"]}),e.jsxs("p",{className:"modal-legal",children:["Ao continuar, você será direcionado ao WhatsApp para falar com nossa equipe.",e.jsx("br",{}),"Seus dados são usados exclusivamente para contato comercial."]})]})]})}),g&&e.jsxs("div",{className:"mobile-cta",children:[e.jsxs("p",{children:["Exclusividade TCF-4",e.jsx("br",{}),"Apenas 1 farmácia por cidade"]}),e.jsxs("button",{className:"btn-mc",onClick:n,children:[e.jsx(m,{size:18}),"QUERO SABER MAIS"]})]}),e.jsx("footer",{children:e.jsxs("div",{className:"wrap",children:[e.jsx("p",{className:"disc",children:"O TCF-4 é um protocolo nutricional voltado ao suporte da fase de manutenção após o tratamento para controle de peso, e deve ser associado a alimentação equilibrada, atividade física e acompanhamento profissional. Não substitui a medicação nem a orientação médica ou nutricional. Dados de mercado são estimativas baseadas em relatórios e projeções do setor."}),e.jsxs("div",{className:"foot-row",children:[e.jsx("span",{children:"© 2026 D7 Pharma do Brasil · R7 do Brasil — Todos os direitos reservados."}),e.jsx("span",{className:"mono",children:"TCF-4 · PROTOCOLO DE MANUTENÇÃO PÓS-GLP-1"})]})]})})]})}export{P as default};
