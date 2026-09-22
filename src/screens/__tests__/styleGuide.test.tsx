import { StyleGuideScreen } from '../dev/StyleGuideScreen';
import { act } from 'react-test-renderer';
import { renderScreen, textOf, unlabelledPressables } from '../../testing/render';


describe('StyleGuideScreen', () => {
  it('renders every primitive and chart', async () => {
    const r = await renderScreen('StyleGuide', StyleGuideScreen);
    const text = textOf(r.root);
    for (const s of ['Style guide', 'Hard sets this week', 'Tonnage per month', 'Where you actually train', 'This cycle vs. last', 'Starting sets per muscle']) {
      expect(text).toContain(s);
    }
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });
});
