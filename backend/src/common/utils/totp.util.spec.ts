import {
  construirUri,
  decodificarBase32,
  generarCodigo,
  generarSecreto,
  verificarCodigo,
} from './totp.util';

describe('totp.util (RFC 6238)', () => {
  const SECRETO_RFC = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  describe('decodificarBase32', () => {
    it('decodifica el secreto de referencia del RFC', () => {
      expect(decodificarBase32(SECRETO_RFC).toString('ascii')).toBe(
        '12345678901234567890',
      );
    });

    it('acepta minusculas y espacios', () => {
      expect(decodificarBase32('gezd gnbv gy3t qojq').toString('ascii')).toBe(
        '1234567890',
      );
    });

    it('rechaza caracteres fuera del alfabeto Base32', () => {
      expect(() => decodificarBase32('AB!CD')).toThrow();
    });
  });

  describe('generarCodigo', () => {
    it('reproduce el vector del RFC en T=59', () => {
      expect(generarCodigo(SECRETO_RFC, 59 * 1000)).toBe('287082');
    });

    it('reproduce el vector del RFC en T=1111111109', () => {
      expect(generarCodigo(SECRETO_RFC, 1111111109 * 1000)).toBe('081804');
    });

    it('reproduce el vector del RFC en T=1234567890', () => {
      expect(generarCodigo(SECRETO_RFC, 1234567890 * 1000)).toBe('005924');
    });

    it('reproduce el vector del RFC en T=2000000000', () => {
      expect(generarCodigo(SECRETO_RFC, 2000000000 * 1000)).toBe('279037');
    });

    it('siempre devuelve seis digitos', () => {
      for (let i = 0; i < 40; i += 1) {
        expect(generarCodigo(SECRETO_RFC, i * 31_000)).toMatch(/^\d{6}$/);
      }
    });

    it('cambia el codigo al pasar el periodo de 30 segundos', () => {
      const primero = generarCodigo(SECRETO_RFC, 0);
      const segundo = generarCodigo(SECRETO_RFC, 30_000);
      expect(primero).not.toBe(segundo);
    });

    it('mantiene el codigo dentro del mismo periodo', () => {
      expect(generarCodigo(SECRETO_RFC, 1000)).toBe(
        generarCodigo(SECRETO_RFC, 29_000),
      );
    });
  });

  describe('generarSecreto', () => {
    it('genera un secreto Base32 de 32 caracteres', () => {
      const secreto = generarSecreto();
      expect(secreto).toMatch(/^[A-Z2-7]{32}$/);
    });

    it('genera secretos distintos en cada llamada', () => {
      const secretos = new Set(
        Array.from({ length: 20 }, () => generarSecreto()),
      );
      expect(secretos.size).toBe(20);
    });

    it('produce un secreto utilizable para generar codigos', () => {
      const secreto = generarSecreto();
      expect(generarCodigo(secreto)).toMatch(/^\d{6}$/);
    });
  });

  describe('verificarCodigo', () => {
    it('acepta el codigo del periodo actual', () => {
      const momento = 1_700_000_000_000;
      const codigo = generarCodigo(SECRETO_RFC, momento);
      expect(verificarCodigo(SECRETO_RFC, codigo, 1, momento)).toBe(true);
    });

    it('tolera un periodo de desfase por reloj', () => {
      const momento = 1_700_000_000_000;
      const anterior = generarCodigo(SECRETO_RFC, momento - 30_000);
      expect(verificarCodigo(SECRETO_RFC, anterior, 1, momento)).toBe(true);
    });

    it('rechaza un codigo demasiado antiguo', () => {
      const momento = 1_700_000_000_000;
      const viejo = generarCodigo(SECRETO_RFC, momento - 300_000);
      expect(verificarCodigo(SECRETO_RFC, viejo, 1, momento)).toBe(false);
    });

    it('rechaza un codigo incorrecto', () => {
      expect(verificarCodigo(SECRETO_RFC, '000000', 1, 59_000)).toBe(false);
    });

    it('rechaza formatos que no son de seis digitos', () => {
      expect(verificarCodigo(SECRETO_RFC, '12345')).toBe(false);
      expect(verificarCodigo(SECRETO_RFC, 'abcdef')).toBe(false);
      expect(verificarCodigo(SECRETO_RFC, '')).toBe(false);
    });

    it('ignora espacios en el codigo capturado', () => {
      const momento = 1_700_000_000_000;
      const codigo = generarCodigo(SECRETO_RFC, momento);
      const conEspacios = `${codigo.slice(0, 3)} ${codigo.slice(3)}`;
      expect(verificarCodigo(SECRETO_RFC, conEspacios, 1, momento)).toBe(true);
    });

    it('rechaza el codigo de otro secreto', () => {
      const momento = 1_700_000_000_000;
      const otro = generarSecreto();
      const codigo = generarCodigo(otro, momento);
      expect(verificarCodigo(SECRETO_RFC, codigo, 1, momento)).toBe(false);
    });
  });

  describe('construirUri', () => {
    it('genera un otpauth compatible con las aplicaciones autenticadoras', () => {
      const uri = construirUri(SECRETO_RFC, 'cliente@example.test', 'Banco ATM');

      expect(uri.startsWith('otpauth://totp/')).toBe(true);
      expect(uri).toContain(`secret=${SECRETO_RFC}`);
      expect(uri).toContain('issuer=Banco%20ATM');
      expect(uri).toContain('digits=6');
      expect(uri).toContain('period=30');
    });

    it('escapa el correo del titular', () => {
      const uri = construirUri(SECRETO_RFC, 'a+b@example.test', 'Banco ATM');
      expect(uri).toContain('a%2Bb%40example.test');
    });
  });
});
