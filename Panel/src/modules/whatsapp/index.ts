import { SwarmModule } from '../registry';
import { whatsapp_mesaj_gonder } from './whatsapp_mesaj_gonder';

const moduleDef: SwarmModule = {
    id: 'wp_module_01',
    name: 'WhatsApp Otonom Entegrasyon',
    category: 'Communication',
    tools: [
        whatsapp_mesaj_gonder
    ]
};

export default moduleDef;
