import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { IToastBpmnPlugin } from '@azerothian/toast-bpmnjs';

export function useDiagram(plugin: IToastBpmnPlugin, diagramId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['diagram', diagramId],
    queryFn: () => plugin.loadDiagram!(diagramId),
    enabled: !!plugin.loadDiagram && !!diagramId,
  });

  const mutation = useMutation({
    mutationFn: (xml: string) => plugin.saveDiagram!(diagramId, xml),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagram', diagramId] });
    },
  });

  return { ...query, save: mutation.mutate, isSaving: mutation.isPending };
}

export function useChainEvents(plugin: IToastBpmnPlugin) {
  return useQuery({
    queryKey: ['chainEvents'],
    queryFn: () => plugin.getChainEventNames!(),
    enabled: !!plugin.getChainEventNames,
  });
}
