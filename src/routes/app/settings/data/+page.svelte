<script lang="ts">
 import { getLocalIdentity } from '$lib/services/accounts/local-accounts';
 import { migrateBrowserData } from '$lib/db/migrate-browser';
 let migrationMessage=$state(''), migrating=$state(false);
 async function migrateOld(){const identity=getLocalIdentity();if(!identity)return;migrating=true;try{const result=await migrateBrowserData(identity.email);migrationMessage=result.found?'旧存档已迁移，请刷新页面。':'未找到此邮箱的旧本机存档。';}catch{migrationMessage='迁移失败，原存档已保留，请稍后重试。';}finally{migrating=false;}}

	import DataManagement from '$lib/components/settings/DataManagement.svelte';
</script>

<div class="page">
	<DataManagement />
</div>

<style>
	.page {
		max-width: 600px;
	}
</style>

<section style="margin-top:24px"><h3>旧存档迁移</h3><p>现在所有用户数据均保存在服务器数据库。若此浏览器还有旧存档，可迁移到当前邮箱账号。</p><button class="btn btn-secondary" onclick={migrateOld} disabled={migrating}>{migrating?'正在迁移…':'迁移此邮箱的旧存档'}</button><p role="status">{migrationMessage}</p></section>
