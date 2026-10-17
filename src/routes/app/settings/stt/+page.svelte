<script lang="ts">
 import { onMount } from 'svelte';
 import { goto } from '$app/navigation';
 onMount(()=>{void goto('/app/settings/persona',{replaceState:true});});
</script>
<p>服务已由系统统一配置，正在返回人物设置…</p>
