<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { useAuthStore } from './stores/auth';
import './styles/tokens.css';

onLaunch(() => {
  const auth = useAuthStore();
  auth.restoreSession();
});
</script>

<style>
@import './styles/tokens.css';

page {
  background: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: var(--font-sm);
}
</style>
