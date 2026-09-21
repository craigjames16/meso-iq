import { mesocyclesService } from '../services/mesocyclesService';
import type { MesocycleDetail, MesocycleListItem } from '../types/plan';
import { ResourceCache } from './cache';

const details = new ResourceCache<MesocycleDetail>();
const lists = new ResourceCache<MesocycleListItem[]>();

export function loadMesocycle(id: number, force = false): Promise<MesocycleDetail> {
  return details.load(String(id), () => mesocyclesService.getMesocycle(id), force);
}

export function cachedMesocycle(id: number): MesocycleDetail | undefined {
  return details.get(String(id));
}

export function loadMesocycles(force = false): Promise<MesocycleListItem[]> {
  return lists.load('all', () => mesocyclesService.getMesocycles(), force);
}

export function cachedMesocycles(): MesocycleListItem[] | undefined {
  return lists.get('all');
}

/** Call after any write that changes a mesocycle: completing a day, starting, ending or deleting a cycle. */
export function invalidateMesocycles(id?: number): void {
  lists.clear();
  if (id == null) details.clear();
  else details.delete(String(id));
}

export function subscribeMesocycles(listener: () => void): () => void {
  const a = lists.subscribe(listener);
  const b = details.subscribe(listener);
  return () => {
    a();
    b();
  };
}
