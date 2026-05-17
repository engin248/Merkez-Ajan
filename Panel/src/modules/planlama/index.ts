import { SwarmModule } from '../registry';
import { planlama_taktik_olustur } from './taktik_araclari';

const moduleDef: SwarmModule = {
    id: 'planlama_mod_001',
    name: '001 Planlama Müdürü',
    category: 'Strategy',
    tools: [
        planlama_taktik_olustur
    ]
};

export default moduleDef;
