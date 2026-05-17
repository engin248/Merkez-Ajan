import { SwarmModule } from '../registry';
import { egitim_beceri_degerlendir } from './egitim_araclari';

const moduleDef: SwarmModule = {
    id: 'egitim_mod_000',
    name: '000 Eğitim Müdürü',
    category: 'Education',
    tools: [
        egitim_beceri_degerlendir
    ]
};

export default moduleDef;
