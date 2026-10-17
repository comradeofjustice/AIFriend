<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { goto } from '$app/navigation';
	import { page as routePage } from '$app/state';
	import { personaStore } from '$lib/stores/persona.svelte';
	import { characterStore } from '$lib/stores/character.svelte';
	import { getCompletedEvents } from '$lib/services/storage/events';
	import SettingsSection from '$lib/components/settings/SettingsSection.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { createPersonaPageState } from './persona-page.svelte';
	import AvatarGallery from './AvatarGallery.svelte';
	import StatsPanel from './StatsPanel.svelte';

	const page = createPersonaPageState();
	const view = $derived(routePage.url.searchParams.get('view') === 'state' ? 'state' : 'profile');
	function navigate(next: string) {
		const url = new URL(routePage.url);
		url.searchParams.set('view', next);
		void goto(url, { noScroll: true, keepFocus: true });
	}
	$effect(() => {
		if (page.isDatingSimMode) getCompletedEvents().then(records => { page.completedEventRecords = records; });
	});
	$effect(() => {
		if (characterStore.isReady) { page.formName = personaStore.name; page.formSystemPrompt = personaStore.systemPrompt; page.formCustomSystemPrompt = personaStore.activeCard.customSystemPrompt ?? ''; }
	});
	let customPromptField = $state<HTMLTextAreaElement>();
	function startFromDefault() {
		page.formCustomSystemPrompt = page.defaultRules;
		customPromptField?.focus();
	}
</script>

<div class="page character-screen">
	<header class="page-header"><h2>人物</h2><p>设定伙伴的形象与性格，看看她最近的状态。</p></header>
	<Tabs bind:value={() => view, navigate} items={[{ value: 'profile', label: '人物资料' }, { value: 'state', label: '状态与动态' }]} label="人物信息切换">
		{#snippet children(tab)}
			{#if tab === 'profile'}
				<div class="profile-sections">
					<SettingsSection title="基本信息">
						<div class="setting-row"><div class="setting-info"><label class="setting-label" for="character-name">名字</label><span class="setting-desc">你想怎么称呼她。</span></div>
							<input id="character-name" class="settings-field name-field" bind:value={page.formName} placeholder="Utsuwa" aria-label="伙伴名字" onblur={page.saveName} />
						</div>
					</SettingsSection>
					<SettingsSection title="外观形象"><AvatarGallery {page} /></SettingsSection>
					<SettingsSection title="性格" description="设定她说话、行动和看待世界的方式。离开输入框时会自动保存。">
						<label class="sr-only" for="character-personality">核心性格</label>
						<textarea id="character-personality" class="settings-field" bind:value={page.formSystemPrompt} rows="6" onblur={page.saveSystemPrompt} placeholder="性格、说话方式和背景…"></textarea>
					</SettingsSection>
					<SettingsSection title="相处方式">
						<div class="setting-row"><div class="setting-info"><span class="setting-label">相处模式</span><span class="setting-desc">恋爱剧情包含关系成长与事件；日常陪伴侧重轻松聊天。</span></div>
							<SegmentedControl label="相处模式" value={page.appMode} onchange={page.requestModeChange} options={[{ value: 'companion', label: '日常陪伴', icon: 'sparkles' }, { value: 'dating_sim', label: '恋爱剧情', icon: 'heart' }]} compact />
						</div>
					</SettingsSection>
				</div>
			{:else}<StatsPanel {page} />{/if}
		{/snippet}
	</Tabs>
</div>

<Dialog.Root open={page.modeConfirmOpen} onOpenChange={(open) => { if (!open) page.cancelModeChange(); }}>
	<Dialog.Portal>
		<Dialog.Overlay class="confirm-modal" />
		<Dialog.Content class="confirm-content">
			<Dialog.Title class="confirm-title">切换相处模式？</Dialog.Title>
			<Dialog.Description class="confirm-message">切换后，关系成长和剧情事件的启用方式会变化，伙伴的名字与性格会保留。</Dialog.Description>
			<div class="confirm-actions"><Dialog.Close class="btn btn-secondary">取消</Dialog.Close><button class="btn btn-primary" onclick={page.confirmModeChange}>确认切换</button></div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<Dialog.Root open={page.resetPromptOpen} onOpenChange={(open) => (page.resetPromptOpen = open)}>
	<Dialog.Portal>
		<Dialog.Overlay class="confirm-modal" />
		<Dialog.Content class="confirm-content">
			<Dialog.Title class="confirm-title">恢复默认角色规则？</Dialog.Title>
			<Dialog.Description class="confirm-message">将清除自定义角色规则并恢复默认规则，性格设定会保留。</Dialog.Description>
			<div class="confirm-actions"><Dialog.Close class="btn btn-secondary">取消</Dialog.Close><button class="btn btn-danger" onclick={page.resetCustomSystemPrompt}>恢复默认</button></div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.profile-sections { display: flex; flex-direction: column; gap: 24px; }
	.name-field { width: min(100%, 260px); }
	textarea { line-height: 1.6; }
	:global(.confirm-modal) { position: fixed; inset: 0; z-index: 1100; }
	:global(.confirm-content) { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1101; width: min(420px, calc(100vw - 32px)); padding: 24px; }
	:global(.confirm-title) { margin: 0; font-size: 18px; font-weight: 500; color: var(--text-primary); }
	:global(.confirm-message) { margin: 12px 0 24px; color: var(--text-secondary); font-size: 14px; line-height: 1.5; }
	.confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
