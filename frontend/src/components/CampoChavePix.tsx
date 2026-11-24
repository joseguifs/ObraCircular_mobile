import { TextInput } from "react-native";

import { CampoFormulario } from "@/components/CampoFormulario";
import { OpcoesFormulario } from "@/components/OpcoesFormulario";
import { formatarCpf, TIPOS_CHAVE_PIX } from "@/features/usuarios/chavePix";
import type { TipoChavePix } from "@/services/usuarios";
import { cores } from "@/theme/tokens";

type Props = {
  tipo: TipoChavePix | "";
  valor: string;
  erro?: string;
  disabled?: boolean;
  label?: string;
  onChangeTipo: (tipo: TipoChavePix) => void;
  onChangeValor: (valor: string) => void;
  onSubmitEditing?: () => void;
};

/** Tipo (e-mail ou CPF) e chave Pix em que o usuário recebe o valor das vendas. */
export function CampoChavePix({
  tipo,
  valor,
  erro,
  disabled = false,
  label = "Chave Pix",
  onChangeTipo,
  onChangeValor,
  onSubmitEditing,
}: Props) {
  const ehCpf = tipo === "CPF";
  return (
    <>
      <OpcoesFormulario
        disabled={disabled}
        erro={tipo ? undefined : erro}
        onChange={(novo) => onChangeTipo(novo as TipoChavePix)}
        opcoes={TIPOS_CHAVE_PIX}
        rotulo="Tipo da chave Pix"
        valor={tipo}
      />
      {tipo ? (
        <CampoFormulario error={erro} icon={ehCpf ? "card-outline" : "mail-outline"} label={label}>
          <TextInput
            accessibilityHint={erro}
            accessibilityLabel={label}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!disabled}
            inputMode={ehCpf ? "numeric" : "email"}
            keyboardType={ehCpf ? "number-pad" : "email-address"}
            maxLength={ehCpf ? 14 : 77}
            onChangeText={(texto) => onChangeValor(ehCpf ? formatarCpf(texto) : texto)}
            onSubmitEditing={onSubmitEditing}
            placeholder={ehCpf ? "000.000.000-00" : "voce@email.com"}
            placeholderTextColor={cores.textoSuave}
            returnKeyType="done"
            style={{ flex: 1, minWidth: 0, paddingVertical: 16, color: cores.texto, fontSize: 16 }}
            value={valor}
          />
        </CampoFormulario>
      ) : null}
    </>
  );
}
