/** Meta-test of the ratchet pattern used by FF-03, FF-04 and FF-05. */
import { filterNew } from './violations';

describe('Baseline ratchet', () => {
	it('tolerates the known debt and rejects any new violation', () => {
		const known = ['game -> player', 'player -> game'];
		const current = ['game -> player', 'player -> game', 'scoring -> game'];
		const fresh = process.env.ARCH_STRICT === '1' ? current : ['scoring -> game'];
		expect(filterNew(current, known, 'meta')).toEqual(fresh);
	});
});
