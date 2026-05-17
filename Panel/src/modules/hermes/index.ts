import { SwarmModule } from '../registry';
import { hermes_hat_push, hermes_hat_pop, hermes_hat_durum } from './rota_araclari';

const moduleDef: SwarmModule = {
    id: 'hermes_mod_002',
    name: '002 Hermes Müdürü',
    category: 'Communication',
    tools: [
        hermes_hat_push,
        hermes_hat_pop,
        hermes_hat_durum
    ]
};

export default moduleDef;
