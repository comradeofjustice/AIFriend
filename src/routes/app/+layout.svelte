<script lang="ts">
	import '$lib/styles/notebook.css';
	import ModeNav from '$lib/components/notebook/ModeNav.svelte';
	import { getLocalIdentity, restoreServerIdentity, SESSION_KEY } from '$lib/services/accounts/local-accounts';
	import { SITE_URL } from '$lib/config/site';
	import ScreenWakeLock from '$lib/components/display/ScreenWakeLock.svelte';
	import { onMount } from 'svelte';
	import { modulesStore } from '$lib/stores/modules.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { onNavigate } from '$app/navigation';
	import UpdateBanner from '$lib/components/updater/UpdateBanner.svelte';

	let { children } = $props();
	let viewportHeight = $state<number>();
	let authorized = $state(false);
	let deploymentError = $state('');
	onMount(() => {
		const initialIdentity = getLocalIdentity();
		if (!initialIdentity) { window.location.replace('/login'); return; }
		const onSaveError = (event:Event) => { deploymentError=(event as CustomEvent).detail||'保存失败，请检查网络，暂时不要关闭页面。'; };
		window.addEventListener('utsuwa-save-error',onSaveError);
		const onAccountChange = (event: StorageEvent) => { if (event.key === SESSION_KEY) window.location.reload(); };
		window.addEventListener('storage', onAccountChange);
		void restoreServerIdentity().then(identity=>{
			if(!identity){window.location.replace('/login');throw new Error('Login required');}
			if(identity.id !== initialIdentity.id){window.location.reload();throw new Error('Account changed');}
			authorized=true;
			return fetch('/api/deployment');
		}).then(r => r.json()).then(async config => {
			if (config.asrReady) settingsStore.markProviderAdded('volcengine-stt');
			if (!config.provider || !config.model) return;
			settingsStore.setProviderConfig(config.provider, { baseUrl: config.baseUrl });
			settingsStore.markProviderAdded(config.provider);
			await modulesStore.setModuleSettings('consciousness', { activeProvider: config.provider, activeModel: config.model });
			await modulesStore.setModuleEnabled('consciousness', true);
			if (config.ttsReady) {
				const wasConfigured = modulesStore.getModuleSettings('speech').activeProvider;
				settingsStore.markProviderAdded('volcengine');
				await modulesStore.setModuleSettings('speech', { activeProvider: 'volcengine', activeModel: config.ttsModel, activeVoiceId: config.voice, activeLanguage: 'zh' });
				if (!wasConfigured) await modulesStore.setModuleEnabled('speech', true);
			}
		}).catch(() => { deploymentError = '暂时无法连接聊天服务，请刷新页面，或通过专属体验链接重新进入。'; });
		// Asks the browser not to evict saves under storage pressure (Safari drops
		// site data after a week without a visit otherwise)

		const viewport = window.visualViewport;
		const resize = () => { viewportHeight = viewport?.height ?? window.innerHeight; };
		resize();
		viewport?.addEventListener('resize', resize);
		window.addEventListener('resize', resize);
		return () => { viewport?.removeEventListener('resize', resize); window.removeEventListener('resize', resize); window.removeEventListener('storage', onAccountChange); window.removeEventListener('utsuwa-save-error',onSaveError); };
	});

	// Crossfade app-side navigations (app <-> settings) where supported.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<!-- Shared app links still get a proper card -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Utsuwa" />
	<meta property="og:description" content="Open-source AI companion with 3D VRM avatars, voice chat, and memory." />
	<meta property="og:image" content={`${SITE_URL}/brand-assets/og-image.jpg`} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={`${SITE_URL}/brand-assets/og-image.jpg`} />
</svelte:head>

<div class="app" style:height={viewportHeight ? `${viewportHeight}px` : undefined}>
	{#if authorized}
		<ModeNav />
		{#if deploymentError}<div class="deployment-error" role="alert">{deploymentError}</div>{/if}
		<div class="app-content"><ScreenWakeLock />{@render children()}</div>
		<UpdateBanner />
	{:else}<div class="opening-page paper-world">正在翻开你们的故事…</div>{/if}
</div>

<style>
	.app {
		height: 100dvh;
		width: 100vw;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.app-content { flex: 1; min-height: 0; position: relative; overflow: hidden; }
	.opening-page { flex: 1; display: grid; place-content: center; }
	.deployment-error { padding: 10px 20px; color: #922; background: #fff2ed; font-size: 14px; }
</style>
