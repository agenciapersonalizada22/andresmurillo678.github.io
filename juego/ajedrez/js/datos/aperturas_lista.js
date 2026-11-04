// ECO | nombre | jugadas en SAN (de más corta a más larga; gana la coincidencia más larga)
export const LISTA = `
B00|Apertura de Peón de Rey (1.e4)|e4
A40|Apertura de Peón de Dama (1.d4)|d4
A00|Apertura Polaca (Sokolsky)|b4
A00|Apertura Grob|g4
A00|Apertura Van Geet|Nc3
A01|Apertura Larsen|b3
A02|Apertura Bird|f4
A02|Gambito From|f4 e5 fxe5 d6
A04|Apertura Réti|Nf3
A04|Defensa Siciliana invertida (Réti)|Nf3 c5
A06|Apertura Réti: Gambito de dama anticipado|Nf3 d5 b3
A10|Apertura Inglesa|c4
A20|Inglesa: Siciliana invertida|c4 e5
A22|Inglesa: Variante Cuatro Caballos|c4 e5 Nc3 Nf6
A30|Inglesa: Simétrica|c4 c5
A40|Defensa Moderna|d4 g6
A41|Defensa Antiindia|d4 d6
A43|Defensa Benoni antigua|d4 c5
A45|Defensa Índia (sin nombre)|d4 Nf6
A45|Ataque Trompowsky|d4 Nf6 Bg5
A46|Sistema Torre|d4 Nf6 Nf3 e6 Bg5
A48|Sistema Londres|d4 Nf6 Nf3 g6 Bf4
A50|Defensa India de dama (sin nombre)|d4 Nf6 c4
A51|Gambito Budapest|d4 Nf6 c4 e5
A52|Gambito Budapest: Variante Adler|d4 Nf6 c4 e5 dxe5 Ng4
A56|Defensa Benoni|d4 Nf6 c4 c5
A57|Gambito Benko|d4 Nf6 c4 c5 d5 b5
A60|Defensa Benoni moderna|d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6
A80|Defensa Holandesa|d4 f5
A83|Gambito Staunton|d4 f5 e4 fxe4 Nc3 Nf6 Bg5
A84|Defensa Holandesa: Variante Clásica|d4 f5 c4 Nf6 g3
B00|Defensa Nimzowitsch|e4 Nc6
B01|Defensa Escandinava|e4 d5
B01|Escandinava: Variante Moderna|e4 d5 exd5 Nf6
B01|Escandinava: Variante Clásica|e4 d5 exd5 Qxd5 Nc3 Qa5
B02|Defensa Alekhine|e4 Nf6
B02|Alekhine: Variante Moderna|e4 Nf6 e5 Nd5 d4 d6 Nf3
B06|Defensa Moderna|e4 g6
B07|Defensa Pirc|e4 d6 d4 Nf6 Nc3
B07|Pirc: Ataque Austriaco|e4 d6 d4 Nf6 Nc3 g6 f4
B10|Defensa Caro-Kann|e4 c6
B12|Caro-Kann: Variante del Avance|e4 c6 d4 d5 e5
B13|Caro-Kann: Variante del Cambio|e4 c6 d4 d5 exd5 cxd5
B15|Caro-Kann: Variante Clásica|e4 c6 d4 d5 Nc3 dxe4 Nxe4
B18|Caro-Kann: Variante Clásica Principal|e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5
B20|Defensa Siciliana|e4 c5
B21|Siciliana: Gambito Smith-Morra|e4 c5 d4 cxd4 c3
B22|Siciliana: Variante Alapin|e4 c5 c3
B23|Siciliana: Variante Cerrada|e4 c5 Nc3
B27|Siciliana: Variante Hiperacelerada del Dragón|e4 c5 Nf3 g6
B30|Siciliana: Variante Rossolimo|e4 c5 Nf3 Nc6 Bb5
B32|Siciliana: Variante Löwenthal|e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5
B33|Siciliana: Variante Sveshnikov|e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5
B40|Siciliana: Variante Paulsen (Kan)|e4 c5 Nf3 e6
B41|Siciliana: Variante Kan|e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6
B50|Siciliana: Variante Dragón (inicio)|e4 c5 Nf3 d6
B54|Siciliana Abierta|e4 c5 Nf3 d6 d4 cxd4 Nxd4
B56|Siciliana Abierta: Variante Clásica|e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3
B70|Siciliana: Variante Dragón|e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6
B76|Siciliana: Dragón Yugoslavo|e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3
B80|Siciliana: Variante Scheveningen|e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6
B90|Siciliana: Variante Najdorf|e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6
B92|Najdorf: Variante Clásica|e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5
B96|Najdorf: Variante Polugaevsky|e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4
C00|Defensa Francesa|e4 e6
C00|Francesa: Variante Avanzada|e4 e6 d4 d5 e5
C01|Francesa: Variante del Cambio|e4 e6 d4 d5 exd5 exd5
C02|Francesa: Avance, Variante Milner-Barry|e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6
C03|Francesa: Variante Tarrasch|e4 e6 d4 d5 Nd2
C10|Francesa: Variante Rubinstein|e4 e6 d4 d5 Nc3 dxe4 Nxe4
C11|Francesa: Variante Clásica|e4 e6 d4 d5 Nc3 Nf6
C15|Francesa: Variante Winawer|e4 e6 d4 d5 Nc3 Bb4
C18|Francesa: Winawer, Variante Principal|e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3
C20|Apertura de Peón de Rey|e4 e5
C21|Gambito Danés|e4 e5 d4 exd4 c3
C23|Apertura del Alfil|e4 e5 Bc4
C24|Apertura del Alfil: Berlín|e4 e5 Bc4 Nf6
C25|Apertura Vienesa|e4 e5 Nc3
C26|Vienesa: Variante Alfil|e4 e5 Nc3 Nf6 g3
C30|Gambito de Rey|e4 e5 f4
C33|Gambito de Rey Aceptado|e4 e5 f4 exf4
C34|Gambito de Rey Aceptado: Fischer|e4 e5 f4 exf4 Nf3 d6
C36|Gambito de Rey: Contragambito Abierto|e4 e5 f4 d5
C40|Apertura del Caballo de Rey|e4 e5 Nf3
C40|Gambito Letón|e4 e5 Nf3 f5
C41|Defensa Philidor|e4 e5 Nf3 d6
C42|Defensa Petrov (Rusa)|e4 e5 Nf3 Nf6
C43|Petrov: Variante Moderna|e4 e5 Nf3 Nf6 d4
C44|Apertura Escocesa|e4 e5 Nf3 Nc6 d4
C44|Gambito Escocés|e4 e5 Nf3 Nc6 d4 exd4 Bc4
C45|Partida Escocesa|e4 e5 Nf3 Nc6 d4 exd4 Nxd4
C46|Apertura de los Cuatro Caballos|e4 e5 Nf3 Nc6 Nc3 Nf6
C46|Apertura de los Tres Caballos|e4 e5 Nf3 Nc6 Nc3
C47|Cuatro Caballos: Variante Escocesa|e4 e5 Nf3 Nc6 Nc3 Nf6 d4
C50|Giuoco Piano (Italiana)|e4 e5 Nf3 Nc6 Bc4
C51|Gambito Evans|e4 e5 Nf3 Nc6 Bc4 Bc5 b4
C53|Giuoco Piano: Variante Clásica|e4 e5 Nf3 Nc6 Bc4 Bc5 c3
C54|Giuoco Piano: Variante Principal|e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4
C55|Defensa de los Dos Caballos|e4 e5 Nf3 Nc6 Bc4 Nf6
C57|Ataque Fegatello (Fried Liver)|e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7
C60|Apertura Española (Ruy López)|e4 e5 Nf3 Nc6 Bb5
C62|Ruy López: Defensa Steinitz|e4 e5 Nf3 Nc6 Bb5 d6
C63|Ruy López: Gambito Schliemann|e4 e5 Nf3 Nc6 Bb5 f5
C64|Ruy López: Defensa Clásica|e4 e5 Nf3 Nc6 Bb5 Bc5
C65|Ruy López: Variante Berlinesa|e4 e5 Nf3 Nc6 Bb5 Nf6
C67|Ruy López: Berlinesa, Muro de Berlín|e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8
C68|Ruy López: Variante del Cambio|e4 e5 Nf3 Nc6 Bb5 a6 Bxc6
C70|Ruy López: Variante Morphy|e4 e5 Nf3 Nc6 Bb5 a6 Ba4
C78|Ruy López: Variante Arkhangelsk|e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O b5 Bb3 Bb7
C84|Ruy López: Variante Cerrada|e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7
C88|Ruy López: Cerrada, Anti-Marshall|e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3
C89|Ruy López: Ataque Marshall|e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5
D00|Apertura de Peón de Dama|d4 d5
D00|Sistema Londres|d4 d5 Bf4
D00|Ataque Veresov|d4 d5 Nc3 Nf6 Bg5
D01|Ataque Richter-Veresov|d4 d5 Nc3
D02|Apertura de Peón de Dama: Variante del Caballo|d4 d5 Nf3
D02|Sistema Colle|d4 d5 Nf3 Nf6 e3
D04|Sistema Colle: Variante Zukertort|d4 d5 Nf3 Nf6 e3 e6 Bd3 c5 b3
D06|Gambito de Dama|d4 d5 c4
D07|Defensa Chigorin|d4 d5 c4 Nc6
D08|Gambito Albin|d4 d5 c4 e5
D10|Defensa Eslava|d4 d5 c4 c6
D11|Eslava: Variante del Cambio|d4 d5 c4 c6 Nf3 Nf6 e3
D15|Eslava: Variante Principal|d4 d5 c4 c6 Nf3 Nf6 Nc3
D17|Eslava: Defensa del Alfil Eslava|d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5
D20|Gambito de Dama Aceptado|d4 d5 c4 dxc4
D30|Gambito de Dama Rehusado|d4 d5 c4 e6
D31|Gambito de Dama Rehusado: Variante Semi-Eslava|d4 d5 c4 e6 Nc3 c6
D35|Gambito de Dama Rehusado: Variante del Cambio|d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5
D37|Gambito de Dama Rehusado: Ortodoxa|d4 d5 c4 e6 Nc3 Nf6 Nf3 Be7
D43|Defensa Semi-Eslava|d4 d5 c4 e6 Nc3 Nf6 Nf3 c6
D45|Semi-Eslava: Variante Meran|d4 d5 c4 e6 Nc3 Nf6 Nf3 c6 e3 Nbd7
D50|Gambito de Dama Rehusado: Variante Clásica|d4 d5 c4 e6 Nc3 Nf6 Bg5
D52|Gambito de Dama Rehusado: Cambridge Springs|d4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 e3 c6 Nf3 Qa5
D60|Gambito de Dama Rehusado: Variante Ortodoxa|d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7
D70|Defensa Neo-India Grünfeld (inicio)|d4 Nf6 c4 g6 g3 d5
D80|Defensa Grünfeld|d4 Nf6 c4 g6 Nc3 d5
D85|Grünfeld: Variante del Cambio|d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3
D90|Grünfeld: Sistema Ruso|d4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3
E00|Defensa Catalana|d4 Nf6 c4 e6 g3
E04|Catalana Abierta|d4 Nf6 c4 e6 g3 d5 Bg2 dxc4
E10|Defensa India de Dama (Gambito)|d4 Nf6 c4 e6 Nf3
E12|Defensa India de Dama|d4 Nf6 c4 e6 Nf3 b6
E15|India de Dama: Fianchetto|d4 Nf6 c4 e6 Nf3 b6 g3
E20|Defensa Nimzo-India|d4 Nf6 c4 e6 Nc3 Bb4
E32|Nimzo-India: Variante Clásica (Capablanca)|d4 Nf6 c4 e6 Nc3 Bb4 Qc2
E40|Nimzo-India: Variante Rubinstein|d4 Nf6 c4 e6 Nc3 Bb4 e3
E46|Nimzo-India: Rubinstein, Sistema Hübner|d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5
E60|Defensa India de Rey|d4 Nf6 c4 g6
E61|India de Rey: Variante Clásica|d4 Nf6 c4 g6 Nc3 Bg7 e4 d6
E70|India de Rey: Sistema Normal|d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3
E73|India de Rey: Ataque Averbakh|d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Bg5
E80|India de Rey: Variante Sämisch|d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3
E90|India de Rey: Variante de los Cuatro Peones|d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4
E97|India de Rey: Variante Mar del Plata|d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6
`.trim().split('\n');
