'use client';

import { useI18n } from '@/lib/hooks/use-i18n';
import { useWorkbenchStore } from '@/lib/workbench/session-store';

export const isSessionConnectionError = (error: string | null) =>
  !!error?.startsWith('openquantum:session-connection:');

export const sessionConnectionTitle = (locale: string) =>
  locale.startsWith('zh') ? '连接中断' : 'Connection interrupted';

/** Transport recovery never changes the runner's persisted status or events. */
export function SessionConnectionNotice() {
  const { locale, t } = useI18n();
  const error = useWorkbenchStore((state) => state.error);
  const attached = useWorkbenchStore((state) => state.attached);
  if (!isSessionConnectionError(error) || attached) return null;
  const chinese = locale.startsWith('zh');
  return (
    <div role="alert" className="border-b border-border px-4 py-3 text-sm">
      <p>{chinese
        ? '无法读取此对话的运行状态。请重新连接，或返回工作台选择其他对话。'
        : 'The conversation status could not be loaded. Reconnect or choose another conversation in the workspace.'}</p>
      <div className="mt-2 flex gap-4">
        <button type="button" className="underline" onClick={() => window.location.reload()}>
          {chinese ? '重新连接' : 'Reconnect'}
        </button>
        <a className="underline" href="/workspace">{t('workbench.common.backToWorkspace')}</a>
      </div>
    </div>
  );
}
