<script lang="ts">
 import { page } from '$app/state';
 import { getLocalIdentity, leaveLocalAccount } from '$lib/services/accounts/local-accounts';
 import { chatStore } from '$lib/stores/chat.svelte';
 const identity = getLocalIdentity();
 function switching(event: MouseEvent) { if(chatStore.isLoading)event.preventDefault(); }
 async function logout(){ if(chatStore.isLoading)return; try{await leaveLocalAccount();window.location.assign('/login');}catch{window.alert('退出失败，请稍后重试。');} }
</script>
<header class="mode-nav paper-world">
 <a class="paper-brand" href="/app/modes" aria-label="纸间，返回模式选择"><span class="flower" aria-hidden="true">✳</span>纸间<small>UTSUWA</small></a>
 <nav class="mode-tabs" aria-label="互动模式">
  <a href="/app" onclick={switching} aria-disabled={chatStore.isLoading} class:active={page.url.pathname === '/app'} aria-current={page.url.pathname === '/app' ? 'page' : undefined}>◇ 3D 剧情</a>
  <a href="/app/text" onclick={switching} aria-disabled={chatStore.isLoading} class:active={page.url.pathname === '/app/text'} aria-current={page.url.pathname === '/app/text' ? 'page' : undefined}>✎ 2D 文字剧情</a>
 </nav>
 <div class="account-controls"><span class="account-email" title={identity?.email}><i class="local-dot"></i>{identity?.email}</span><button onclick={logout} disabled={chatStore.isLoading} aria-label="退出账号">退出 ↗</button></div>
</header>
