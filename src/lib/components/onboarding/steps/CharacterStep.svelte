<script lang="ts">
	import { Icon } from '$lib/components/ui';

	interface Props {
		name: string;
		systemPrompt: string;
		onNameChange: (name: string) => void;
		onSystemPromptChange: (prompt: string) => void;
		onNext: () => void;
		onBack: () => void;
	}

	let { name, systemPrompt, onNameChange, onSystemPromptChange, onNext, onBack }: Props = $props();

	const isValid = $derived(name.trim().length > 0);
</script>

<div class="ob-step">
	<div class="ob-head">
		<h2 class="ob-title">给你的伙伴起个名字</h2>
		<p class="ob-subtitle">为她取一个名字，写下你喜欢的性格。</p>
	</div>

	<div class="ob-field">
		<label for="name" class="ob-label">名字</label>
		<input
			id="name"
			type="text"
			class="ob-input"
			value={name}
			oninput={(e) => onNameChange(e.currentTarget.value)}
			placeholder="请输入名字…"
		/>
	</div>

	<details class="ob-advanced"><summary>自定义她的性格</summary>
	<div class="ob-field">
		<label for="personality" class="ob-label">核心性格</label>
		<textarea
			id="personality"
			class="ob-textarea"
			value={systemPrompt}
			oninput={(e) => onSystemPromptChange(e.currentTarget.value)}
			placeholder="描述她的性格、说话方式和背景…"
			rows="5"
		></textarea>
		<span class="ob-hint">这些设定会影响她的说话方式和行为。</span>
	</div>
	</details>

	<div class="ob-actions ob-actions--split">
		<button class="btn btn-secondary" onclick={onBack}>
			<Icon name="chevron-left" size={16} />
			上一步
		</button>
		<button class="btn btn-primary" onclick={onNext} disabled={!isValid}>
			下一步
			<Icon name="chevron-right" size={16} />
		</button>
	</div>
</div>
