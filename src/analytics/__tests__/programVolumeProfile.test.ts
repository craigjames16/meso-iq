import { lowVolumeMuscles, programVolumeProfile } from '../volume';

describe('programVolumeProfile', () => {
  it('sums starting sets per muscle, with 2 for missing values', () => {
    const profile = programVolumeProfile([
      { exercises: [{ muscle: 'CHEST', startingSets: 4 }, { muscle: 'SHOULDERS' }] },
      { exercises: [{ muscle: 'CHEST' }, { muscle: undefined, startingSets: 9 }] },
    ]);
    expect(profile.CHEST).toBe(6);
    expect(profile.SHOULDERS).toBe(2);
    expect(profile.BACK).toBe(0);
  });

  it('lists trained muscles under 4 sets, lowest first', () => {
    const profile = programVolumeProfile([
      { exercises: [{ muscle: 'CHEST', startingSets: 3 }, { muscle: 'SHOULDERS', startingSets: 2 }, { muscle: 'BACK', startingSets: 4 }] },
    ]);
    expect(lowVolumeMuscles(profile)).toEqual(['SHOULDERS', 'CHEST']);
  });
});
