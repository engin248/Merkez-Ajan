import { SwarmModule } from '../registry';
import { albay_sistem_denetimi } from './albay_denetim';

const moduleDef: SwarmModule = {
    id: 'albay_mod_000',
    name: '000 Albay Müdürü',
    category: 'System',
    tools: [
        albay_sistem_denetimi
    ]
};

export default moduleDef;
