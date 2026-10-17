<script lang="ts">
	import CompanionStateSummary from '$lib/components/ui/CompanionStateSummary.svelte';
	import SettingsSection from '$lib/components/settings/SettingsSection.svelte';
	import { Icon } from '$lib/components/ui';
	import type { PersonaPageState } from './persona-page.svelte';
	let { page }: { page: PersonaPageState } = $props();
</script>

<div class="state-panel">
	<SettingsSection title="伙伴状态" description="这里与你聊天时显示的状态一致，会随着相处逐渐变化。">
		{#if page.isCharacterLoading}<p class="loading" role="status">正在读取人物资料…</p>{/if}
		<CompanionStateSummary />
	</SettingsSection>
	{#if page.isDatingSimMode}
		<SettingsSection title="共同回忆" description="记录你们一起经历的特别时刻。">
			{#if page.achievements.length}
				<ul>{#each page.achievements as achievement}<li>
					<Icon name={page.achievementConfig[achievement.type].icon} size={16} />
					<div><strong>{achievement.name}</strong><span>{page.achievementConfig[achievement.type].label}</span></div>
					<time>{page.formatAchievementDate(achievement.completedAt)}</time>
				</li>{/each}</ul>
			{:else}<p class="empty">还没有共同回忆，随着你们越来越熟悉，故事会慢慢写在这里。</p>{/if}
		</SettingsSection>
	{/if}
</div>
<style>
	.state-panel { display: flex; flex-direction: column; gap: 24px; }
	ul { margin: 0; padding: 0; list-style: none; }
	li { display: flex; align-items: center; gap: 12px; padding: 12px 0; color: var(--text-secondary); }
	li + li { border-top: 1px solid var(--border-light); }
	li div { flex: 1; min-width: 0; }
	strong { display: block; color: var(--text-primary); font-size: 14px; font-weight: 500; }
	span, time, .empty, .loading { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
	time { white-space: nowrap; }
	@media (max-width: 480px) { li { flex-wrap: wrap; } time { width: 100%; padding-left: 28px; } }
</style>
