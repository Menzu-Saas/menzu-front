import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, Bike, CheckCheck, ChefHat, Clock3, MapPin, Receipt, ShieldCheck, Smartphone, Store, Wallet } from "lucide-react";
import { Logo } from "@/components/ui";
import styles from "./product-landing.module.css";

type Props = { audience: "restaurant" | "courier"; loginHref: string; signupHref: string; loggedIn: boolean; exampleHref?: string };
export function ProductLanding({audience,loginHref,signupHref,loggedIn,exampleHref}:Props) {
 const courier=audience==="courier";
 const features=courier?[
  {icon:MapPin,title:"Seu próximo destino, bem claro.",text:"Endereço, ponto de entrega e navegação reunidos para você seguir sua rota.",kind:"route"},
  {icon:Wallet,title:"Cada entrega na sua conta.",text:"Consulte remuneração, bônus e valores aprovados pela loja.",kind:"money"},
  {icon:Clock3,title:"Sua rotina, organizada.",text:"Planeje seus horários e controle quando está disponível para receber ofertas.",kind:"schedule"},
  {icon:Smartphone,title:"Da oferta à entrega, sem se perder.",text:"Veja os detalhes antes de aceitar e confirme a entrega com o código do cliente.",kind:"steps"},
  {icon:ShieldCheck,title:"Localização durante a entrega.",text:"Compartilhe sua posição na rota para a loja e o cliente acompanharem o pedido.",kind:"status"},
 ]:[
  {icon:Store,title:"Seu cardápio. Sua identidade.",text:"Apresente pratos, adicionais e ofertas em um cardápio feito para o celular.",kind:"menu"},
  {icon:Receipt,title:"Pedidos em um só lugar.",text:"Acompanhe cada etapa, da confirmação até a saída para entrega.",kind:"steps"},
  {icon:ChefHat,title:"Uma cozinha mais organizada.",text:"Dê visibilidade ao preparo e mantenha sua equipe por dentro de cada pedido.",kind:"schedule"},
  {icon:Bike,title:"Delivery com mais clareza.",text:"Organize entregadores, distribua pedidos e acompanhe as entregas em andamento.",kind:"route"},
  {icon:Smartphone,title:"Uma boa experiência até a última etapa.",text:"Carrinho, checkout e acompanhamento conectados para quem compra com você.",kind:"status"},
 ];
 return <div className={styles.page}>
  <header className={styles.header}><Link href="/" aria-label={courier?"Início do Menzu Entregador":"Início do Menzu Restaurante"}><Logo size="sm"/></Link><nav aria-label="Navegação principal"><a href="#recursos">Recursos</a><a href="#como-funciona">Como funciona</a><a href="#duvidas">Dúvidas</a></nav><div role="navigation" aria-label="Conta"><Link className={styles.login} href={loginHref}>{loggedIn?courier?"Abrir painel":"Acessar restaurante":"Entrar"}</Link><Link className={styles.smallCta} href={signupHref}>{loggedIn?courier?"Continuar":"Criar restaurante":"Criar conta"}<ArrowRight size={15}/></Link></div></header>
  <main>
   <section className={styles.hero}>
    <div className={styles.glow} aria-hidden="true"/>
    <p className={styles.pill}><span/>{courier?"MENZU PARA ENTREGADORES":"MENZU PARA RESTAURANTES"}</p>
    <h1>{courier?<>Menos dúvidas na rota.<br/>Mais foco em <em>entregar.</em></>:<>Seu restaurante pronto<br/>para o <em>próximo pedido.</em></>}</h1>
    <p className={styles.lead}>{courier?"Seus pedidos, sua agenda e seus ganhos no mesmo lugar. Uma experiência simples para acompanhar cada entrega, do aceite à chegada.":"Do cardápio digital à cozinha e ao delivery. Conecte sua operação e ofereça uma experiência que dá vontade de pedir de novo."}</p>
    <div className={styles.actions}><Link className={styles.primary} href={signupHref}>{courier?loggedIn?"Ir para minhas entregas":"Criar conta de entregador":loggedIn?"Criar meu cardápio":"Começar com meu restaurante"}<ArrowRight size={18}/></Link><a className={styles.secondary} href="#como-funciona">Conhecer o Menzu<ArrowDown size={16}/></a></div>
    <p className={styles.heroNote}>{courier?"Já faz entregas para uma loja? Entre com sua conta e aceite o convite do estabelecimento.":"Uma operação conectada. Uma experiência simples para a sua equipe."}</p>
    <div className={styles.trust}>{(courier?["Rotas organizadas","Ganhos visíveis","Disponibilidade na sua mão"]:["Cardápio digital","Gestão de pedidos","Entrega acompanhada"]).map(text=><span key={text}><CheckCheck size={16}/>{text}</span>)}</div>
    <ProductPreview courier={courier}/>
   </section>
   <div className={styles.productStrip}><span>MENZU, DO INÍCIO AO FIM</span>{(courier?["Aceitar","Coletar","Navegar","Entregar"]:["Receber","Preparar","Despachar","Acompanhar"]).map((text,i)=><div key={text}><span>0{i+1}</span>{text}</div>)}</div>
   <section id="recursos" className={styles.section}><div className={styles.sectionHeading}><p className={styles.eyebrow}>TUDO NO SEU LUGAR</p><h2>{courier?"Feito para quem está\nsempre em movimento.":"Mais fluidez na operação.\nMais cuidado em cada pedido."}</h2><p>{courier?"Informação fácil de encontrar, para você cuidar do que vem pela frente.":"Ferramentas que trabalham juntas, do primeiro clique do cliente até a entrega."}</p></div><div className={styles.bento}>{features.map(({icon:Icon,title,text,kind},i)=><article key={title} className={i>2?styles.wideCard:styles.feature}><div className={styles.featureIcon}><Icon size={22}/></div><h3>{title}</h3><p>{text}</p><FeatureVisual kind={kind} courier={courier}/></article>)}</div></section>
   {!courier&&<RestaurantShowcase/>}
   <section id="como-funciona" className={styles.process}><div><p className={styles.eyebrow}>SIMPLES DESDE O COMEÇO</p><h2>{courier?"Sua próxima entrega\ncomeça por aqui.":"Uma nova forma de\ncuidar da sua operação."}</h2><p>{courier?"O Menzu conecta você às entregas das lojas às quais está vinculado.":"Comece pelo essencial e organize a rotina da sua loja em um único ambiente."}</p><Link className={styles.primary} href={signupHref}>Começar agora<ArrowRight size={18}/></Link></div><ol>{(courier?[
  ["Crie sua conta","Cadastre seus dados e entre no Menzu Entregador."],
  ["Conecte-se à sua loja","Solicite e aceite um convite do restaurante para fazer parte da equipe de entregas."],
  ["Fique ativo e siga sua rota","Confira as ofertas, aceite uma entrega e acompanhe as etapas até a confirmação."],
 ]:[
  ["Cadastre seu restaurante","Configure a loja, os horários e as formas de atendimento."],
  ["Monte seu cardápio","Adicione produtos, imagens, preços e opções para seus clientes."],
  ["Receba e acompanhe pedidos","Organize a cozinha e o delivery com toda a equipe na mesma página."],
 ]).map(([title,text],i)=><li key={title}><span>0{i+1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></section>
   <section id="duvidas" className={styles.faq}><div><p className={styles.eyebrow}>PODE PERGUNTAR</p><h2>Antes de começar.</h2></div><div>{(courier?[
  ["Como recebo ofertas de entrega?","Você precisa estar vinculado à equipe de uma loja e ficar ativo no sistema. As ofertas seguem a prioridade definida na fila de entregadores."],
  ["Preciso manter a localização ligada?","Durante a entrega, autorize o GPS e mantenha a página aberta e o navegador ativo para compartilhar sua posição."],
  ["Posso acompanhar meus ganhos?","Sim. O painel mostra valores pendentes e aprovados pela loja. A disponibilidade de saque depende da integração de pagamentos."],
 ]:[
  ["O cliente precisa instalar um aplicativo?","O cardápio e o checkout podem ser acessados diretamente pelo navegador do celular ou computador."],
  ["Posso organizar a equipe do restaurante?","Sim. Convide sua equipe e distribua os acessos conforme o papel de cada pessoa na operação."],
  ["O Menzu também acompanha as entregas?","Sim. A loja e o cliente podem acompanhar as etapas e a localização compartilhada pelo entregador durante a rota."],
 ]).map(([question,answer])=><details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
   <section className={styles.finalCta}><span className={styles.ctaIcon}>{courier?<Bike size={30}/>:<Store size={30}/>}</span><h2>{courier?"Seu próximo destino\né com o Menzu.":"O próximo capítulo da sua\nloja começa com um pedido."}</h2><p>{courier?"Mais clareza para a sua rotina de entregas.":"Traga mais organização para cada etapa do seu restaurante."}</p><Link className={styles.primary} href={signupHref}>{courier?"Começar como entregador":"Começar com o Menzu"}<ArrowRight size={18}/></Link>{exampleHref&&<a className={styles.example} href={exampleHref}>Cardápio de exemplo <ArrowRight size={15}/></a>}</section>
  </main>
  <footer className={styles.footer}><Link href="/" aria-label="Menzu — início"><Logo size="sm"/></Link><p>{courier?"Mais clareza em cada entrega.":"Conectando sua loja ao próximo pedido."}</p><div><a href="#recursos">Recursos</a><a href="#duvidas">Ajuda</a><Link href={loginHref}>{loggedIn?"Meu painel":"Entrar na conta"}</Link></div><small>© Menzu</small></footer>
 </div>;
}

function ProductPreview({courier}:{courier:boolean}){
 return <figure className={styles.preview}><div className={styles.previewBar}><div className={styles.windowDots}><i/><i/><i/></div><span>menzu / {courier?"entregas":"operação"}</span><span className={styles.previewLabel}>{courier?"Tela real · dados pessoais ocultos":"Dados de demonstração"}</span></div><Image className={styles.realScreenshot} src={courier?"/product-captures/courier-real.webp":"/product-captures/landing/dashboard.png"} width={courier?1420:1872} height={courier?680:920} sizes="(max-width: 640px) 100vw, 1050px" priority alt={courier?"Captura real da agenda no sistema Menzu Entregador":"Painel geral com faturamento, pedidos e produtos mais vendidos"}/></figure>;
}

const customerJourney = [
 {src:"/product-captures/landing/menu-home.png",width:1872,height:920,title:"Cardápio",text:"A loja, as ofertas e os pratos em uma experiência feita para o celular.",alt:"Cardápio mobile da Buguer House"},
 {src:"/product-captures/landing/menu-list.png",width:1872,height:920,title:"Escolha",text:"Produtos, fotos, preços e disponibilidade fáceis de consultar.",alt:"Lista de pratos no cardápio mobile"},
 {src:"/product-captures/landing/cart.png",width:1872,height:920,title:"Sacola",text:"Resumo do pedido, quantidades, cupom e total antes de avançar.",alt:"Sacola de compras com resumo do pedido"},
 {src:"/product-captures/landing/checkout.png",width:393,height:846,title:"Checkout",text:"Dados e endereço reunidos em uma finalização direta, sem aplicativo.",alt:"Checkout mobile com dados e endereço de entrega"},
 {src:"/product-captures/landing/tracking.png",width:1872,height:920,title:"Acompanhe",text:"O cliente acompanha cada etapa até a confirmação da entrega.",alt:"Acompanhamento mobile do pedido"},
];

function RestaurantShowcase(){
 return <section className={styles.showcase} aria-labelledby="showcase-title">
  <div className={styles.sectionHeading}><p className={styles.eyebrow}>MENZU POR DENTRO</p><h2 id="showcase-title">Veja o Menzu funcionando.</h2><p>Do primeiro clique do cliente ao preparo na cozinha, cada tela participa da mesma operação.</p><span className={styles.demoBadge}>Dados de demonstração</span></div>
  <div className={styles.operationGrid}>
   <figure><div className={styles.operationCapture}><Image src="/product-captures/landing/kitchen.png" width={1872} height={1196} sizes="(max-width: 760px) 100vw, 560px" alt="Cozinha com pedidos a preparar, em preparo e prontos"/></div><figcaption><strong>Produção no ritmo da cozinha</strong><span>Pedidos separados por etapa, prioridade e tempo de preparo.</span></figcaption></figure>
   <figure><div className={styles.operationCapture}><Image src="/product-captures/landing/menu-admin.png" width={1872} height={920} sizes="(max-width: 760px) 100vw, 560px" alt="Gestão do cardápio com seis pratos e disponibilidade"/></div><figcaption><strong>Cardápio sob controle</strong><span>Fotos, preços e disponibilidade organizados no painel.</span></figcaption></figure>
  </div>
  <div className={styles.journeyHeading}><span>Experiência do cliente</span><p>Do cardápio à entrega, direto pelo navegador.</p></div>
  <div className={styles.journey}>{customerJourney.map((step,index)=><figure key={step.title}><span className={styles.stepNumber}>0{index+1}</span><div className={styles.phoneCapture}><Image src={step.src} width={step.width} height={step.height} sizes="230px" alt={step.alt} unoptimized/></div><figcaption><strong>{step.title}</strong><span>{step.text}</span></figcaption></figure>)}</div>
 </section>;
}

function FeatureVisual({kind,courier}:{kind:string;courier:boolean}){
 return <div className={styles.realFeatureCapture} aria-hidden="true"><Image src={courier?"/product-captures/courier-real.webp":"/product-captures/restaurant-real.webp"} width={courier?1420:1440} height={courier?680:850} sizes="(max-width: 640px) 85vw, 420px" alt="" className={kind==="schedule"?styles.scheduleCrop:styles.detailCrop}/></div>;
}
