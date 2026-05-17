import { SwarmModule } from '../registry';
import { youtube_islem } from './youtube_islem';

const moduleDef: SwarmModule = {
    id: 'yt_module_01',
    name: 'YouTube Otonom Entegrasyon',
    category: 'Media',
    tools: [
        youtube_islem
    ]
};

export default moduleDef;
