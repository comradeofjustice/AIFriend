<script lang="ts">
 import '$lib/styles/notebook.css';
 import Portrait from '$lib/components/notebook/Portrait.svelte';
 import { enterLocalAccount, restoreServerIdentity, requestEmailCode } from '$lib/services/accounts/local-accounts';
 import { normalizeVerificationCode } from '$lib/utils/verification-code';
 import { onMount } from 'svelte';
 let register=$state(false), email=$state(''), password=$state(''), code=$state(''), busy=$state(false), error=$state('');
 let sending=$state(false), countdown=$state(0), notice=$state(''), mailReady=$state(false);
 onMount(()=>{
  void restoreServerIdentity().then(identity=>{if(identity)window.location.replace('/app/modes');}).catch(()=>{});
  void fetch('/api/auth/status').then(r=>r.json()).then(data=>mailReady=data.mailReady).catch(()=>{});
  const timer=setInterval(()=>{if(countdown>0)countdown--;},1000);return ()=>clearInterval(timer);
 });
 function handleCodeInput(event:Event){const input=event.currentTarget as HTMLInputElement;code=normalizeVerificationCode(input.value);input.value=code;input.setCustomValidity('');}
 async function sendCode(){
  if(sending||countdown>0)return;sending=true;error='';notice='';
  try{await requestEmailCode(email);countdown=60;notice='验证码已发送，请检查收件箱和垃圾邮件，10 分钟内有效。';}catch(e){error=e instanceof Error?e.message:'验证码发送失败。';}finally{sending=false;}
 }
 async function submit(event: SubmitEvent){
  event.preventDefault();if(busy)return;busy=true;error='';
  try{await enterLocalAccount(email,password,register,code);try{const {migrateBrowserData}=await import('$lib/db/migrate-browser');await migrateBrowserData(email);}catch{notice='登录成功，但旧存档迁移失败。原存档已保留，可在数据设置中重试。';window.alert(notice);}window.location.assign('/app/modes');}
  catch(e){error=e instanceof Error?e.message:'暂时无法登录，请稍后重试。';busy=false;}
 }
</script>
<svelte:head><title>纸间 · 把心事，写给她</title><meta name="robots" content="noindex,nofollow"/></svelte:head>
<main class="login-page paper-world">
 <a href="/login" class="paper-brand"><span class="flower" aria-hidden="true">✳</span>纸间<small>UTSUWA</small></a>
 <div class="login-grid">
  <section class="login-story">
   <span class="paper-tag">一段只属于你们的故事</span>
   <h1>有些心事，<br/>想慢慢<span>写给你。</span></h1>
   <p class="intro">从一句「今天怎么样」开始。<br/>在文字里靠近，在故事里相遇。</p>
   <div class="login-art"><div class="portrait paper-card tape"><Portrait/><p>在这里，等你来。<span>♡</span></p></div><div class="love-note">不用准备好话题，<br/>你来了就很好。<span>— 给你的小纸条</span></div><span class="sketch-star" aria-hidden="true">✧</span></div>
  </section>
  <section class="login-form paper-card tape" aria-labelledby="login-heading">
   <p class="eyebrow">A LITTLE SPACE, JUST FOR YOU</p>
   <h2 id="login-heading">{register?'从这里，认识你。':'欢迎回来。'}</h2>
   <p class="muted">{register?'留一个名字，让故事有个起点。':'她把故事翻到了上次那一页。'}</p>
   <form onsubmit={submit}>
    <label for="email">你的邮箱<input id="email" class="paper-input" type="email" autocomplete="email" bind:value={email} placeholder="you@example.com" required maxlength="254"/></label>
    <label for="password">密码<input id="password" class="paper-input" type="password" autocomplete={register?'new-password':'current-password'} bind:value={password} placeholder="至少 8 个字符" minlength="8" maxlength="128" required/></label>
    {#if register}<label for="email-code">邮箱验证码<div class="code-row"><input id="email-code" class="paper-input" bind:value={code} placeholder="6 位数字验证码" inputmode="numeric" autocomplete="one-time-code" pattern={'[0-9]{6}'} oninput={handleCodeInput} oninvalid={(event)=>event.currentTarget.setCustomValidity('请输入邮件中的 6 位数字验证码。')} maxlength="32" required/><button type="button" class="paper-button" onclick={sendCode} disabled={sending||countdown>0||!mailReady}>{sending?'发送中…':countdown>0?`${countdown}s 后重发`:'获取验证码'}</button></div></label>{#if !mailReady}<p class="mail-hint">发信邮箱配置中，暂时无法发送验证码。</p>{/if}{/if}
    {#if notice}<p class="mail-notice" role="status">{notice}</p>{/if}
    {#if error}<p class="paper-error" role="alert">{error}</p>{/if}
    <button class="paper-button primary login-submit" type="submit" disabled={busy}>{busy?'正在翻开故事…':register?'验证邮箱，开始故事':'登录，继续我们的故事'}<span aria-hidden="true">↗</span></button>
   </form>
   <p class="switch-account">{register?'已经有账号？':'第一次来这里？'} <button class="ink-link" onclick={()=>{register=!register;error='';}} disabled={busy}>{register?'直接登录':'注册并验证邮箱'}</button></p>
   <div class="local-note"><span aria-hidden="true">⌂</span><p>邮箱验证注册 · 账号、聊天、记忆与设置统一保存在服务器数据库。<br/>{register?'同一邮箱可在不同设备继续同一段故事。':'旧本机账号请先验证邮箱注册，登录后自动迁移原有存档。'}</p></div>
  </section>
 </div>
 <footer>不是每一天都特别，但每一天，都可以有人听你说。<span>MADE OF LITTLE MOMENTS ♡</span></footer>
</main>
<style>
.login-page{min-height:100dvh;padding:28px 6vw 18px;overflow:auto}.login-grid{max-width:1140px;margin:55px auto 20px;display:grid;grid-template-columns:1.15fr 1fr;gap:10%;align-items:center}.login-story h1{font-size:clamp(40px,4.7vw,65px);margin:24px 0 20px;line-height:1.4;letter-spacing:-2px}.login-story h1 span{color:var(--red);position:relative;white-space:nowrap}.login-story h1 span:after{content:'';position:absolute;bottom:-4px;left:0;width:100%;height:9px;border-top:3px solid var(--red);border-radius:70% 20%;transform:rotate(-3deg)}.intro{font-size:20px;line-height:1.8;color:#716b61}.login-art{height:280px;position:relative;margin:34px 0 0 10px}.portrait{width:190px;padding:8px;transform:rotate(-6deg)}.portrait p{font-size:15px;padding:7px 5px}.portrait p span{float:right;color:var(--red)}.love-note{position:absolute;top:72px;left:173px;padding:25px 24px;background:var(--yellow);box-shadow:4px 4px 0 #2d2d2d25;border-radius:var(--wobble-md);transform:rotate(7deg);line-height:1.9;font-size:20px}.love-note span{display:block;font-size:13px;color:#827a5e;margin-top:10px}.sketch-star{position:absolute;left:360px;top:15px;color:var(--blue);font-size:60px;transform:rotate(15deg)}.login-form{padding:38px 35px;transform:rotate(.6deg)}.login-form h2{font-size:36px;margin:15px 0 10px}.login-form form{margin-top:26px;display:flex;flex-direction:column;gap:21px}.login-form label{display:flex;flex-direction:column;gap:8px;font-size:16px}.login-submit{width:100%;justify-content:space-between;margin-top:4px}.switch-account{text-align:center;font-size:15px;margin-top:24px!important}.local-note{display:flex;align-items:flex-start;gap:10px;border-top:1.5px dashed #cec6b7;padding-top:18px;margin-top:24px;font-size:12px;line-height:1.8;color:#847e72}.local-note>span{font-size:23px}.login-page footer{display:flex;justify-content:space-between;gap:15px;font-size:13px;color:#8c8579;max-width:1140px;margin:38px auto 0}.login-page footer span{letter-spacing:.1em;font-size:11px}@media(max-width:850px){.login-page{padding:24px}.login-grid{gap:35px;margin-top:45px}.login-art{transform:scale(.8);transform-origin:top left;height:240px}.login-form{padding:30px 25px}.login-story h1{font-size:43px}}@media(max-width:640px){.login-grid{display:flex;flex-direction:column;align-items:stretch;margin:28px 0}.login-story h1{font-size:42px;margin:15px 0}.login-art,.login-story .intro{display:none}.login-form{transform:none}.login-form h2{font-size:30px}.login-page footer{display:block}.login-page footer span{display:block;margin-top:10px}}
.code-row{display:flex;gap:10px;align-items:center}.code-row input{min-width:0;flex:1}.code-row button{font-size:13px;white-space:nowrap;padding:8px 12px;min-width:115px}.mail-hint{font-size:12px;color:#897a61}.mail-notice{font-size:13px;color:#2d5da1}
</style>
