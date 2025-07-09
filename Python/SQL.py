import streamlit as st
import mysql.connector
import pandas as pd

# -------------------------
# Conexão com banco
# -------------------------
def connect_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="12345678",
        database="treino_sql"
    )

# -------------------------
# App
# -------------------------
st.set_page_config(page_title="Gamification SQL", layout="wide")
st.title("🏆 Plataforma de Desafios SQL para o Time")
st.title(" Tabelas: city / customer / embarcador / fretes / transportador")

# -----------------------------------
# Nome do usuário
# -----------------------------------
usuario = st.text_input("Seu nome ou identificador:", max_chars=50)
if not usuario:
    st.warning("⚠️ Preencha seu nome para participar!")
    st.stop()

# -------------------------
# Conectar banco
# -------------------------
conn = connect_db()
cursor = conn.cursor()

# -----------------------------------
# Carregar desafios
# -----------------------------------
cursor.execute("SELECT id, titulo, enunciado FROM desafios")
desafios = cursor.fetchall()

if not desafios:
    st.info("Nenhum desafio cadastrado ainda. Peça ao admin para adicionar!")
    st.stop()

# -----------------------------------
# Seleção de desafio
# -----------------------------------
desafio_titulos = [f"{d[0]} - {d[1]}" for d in desafios]
escolha = st.selectbox("Selecione um desafio:", desafio_titulos)
desafio_id = int(escolha.split(' - ')[0])
desafio = next(d for d in desafios if d[0] == desafio_id)

st.subheader(desafio[1])
st.markdown(desafio[2])

# -----------------------------------
# Mostrar resultado esperado (opcional)
# -----------------------------------
with st.expander("👁️ Ver resultado esperado"):
    try:
        cursor.execute("SELECT resposta_sql FROM desafios WHERE id = %s", (desafio_id,))
        gabarito_query = cursor.fetchone()[0]
        
        cursor.execute(gabarito_query)
        gabarito_result = cursor.fetchall()
        gabarito_columns = [col[0] for col in cursor.description]
        df_gabarito = pd.DataFrame(gabarito_result, columns=gabarito_columns)
        
        st.dataframe(df_gabarito)
    except Exception as e:
        st.error(f"Erro ao carregar resultado esperado: {e}")


# -----------------------------------
# Área para query
# -----------------------------------
user_query = st.text_area(
    "✏️ Escreva sua query-resposta:",
    height=300,
    placeholder="Digite sua consulta SQL aqui..."
)

# -----------------------------------
# Botão para validar
# -----------------------------------
col1, col2 = st.columns(2)

# ---------------------------------------
# Botão para Executar (sem validar)
# ---------------------------------------
with col1:
    if st.button("▶️ Executar"):
        if not user_query.strip():
            st.warning("Escreva uma query para executar!")
        else:
            try:
                cursor.execute(user_query)
                user_result = cursor.fetchall()
                user_columns = [col[0] for col in cursor.description]
                df_user = pd.DataFrame(user_result, columns=user_columns)
                st.success("✅ Resultado da sua query:")
                st.dataframe(df_user)
            except Exception as e:
                st.error(f"Erro ao rodar a query: {e}")

# ---------------------------------------
# Botão para Enviar Resposta (validar)
# ---------------------------------------
with col2:
    if st.button("✅ Enviar Resposta"):
        if not user_query.strip():
            st.warning("Escreva uma query para validar!")
        else:
            try:
                # Resposta correta
                cursor.execute("SELECT resposta_sql FROM desafios WHERE id = %s", (desafio_id,))
                expected_query = cursor.fetchone()[0]
                cursor.execute(expected_query)
                expected_result = cursor.fetchall()
                expected_columns = [col[0] for col in cursor.description]
                df_expected = pd.DataFrame(expected_result, columns=expected_columns)

                # Resposta do usuário
                cursor.execute(user_query)
                user_result = cursor.fetchall()
                user_columns = [col[0] for col in cursor.description]
                df_user = pd.DataFrame(user_result, columns=user_columns)

                # Comparação
                if df_expected.equals(df_user):
                    st.success("✅ Resposta correta! Parabéns! 🎉")
                    cursor.execute(
                        "INSERT INTO ranking (usuario, desafio_id) VALUES (%s, %s)",
                        (usuario, desafio_id)
                    )
                    conn.commit()
                else:
                    st.error("❌ Resposta incorreta. Tente novamente!")
                    with st.expander("Resultado esperado"):
                        st.dataframe(df_expected)
                    with st.expander("Seu resultado"):
                        st.dataframe(df_user)

            except Exception as e:
                st.error(f"Erro ao validar a resposta: {e}")


# -----------------------------------
# Exibir ranking geral
# -----------------------------------
st.subheader("🏅 Ranking de Participantes")

try:
    cursor.execute("""
        SELECT usuario, COUNT(*) AS acertos
        FROM ranking
        GROUP BY usuario
        ORDER BY acertos DESC
    """)
    ranking_data = cursor.fetchall()
    df_ranking = pd.DataFrame(ranking_data, columns=["Usuário", "Acertos"])
    st.dataframe(df_ranking)
except Exception as e:
    st.error(f"Erro ao carregar ranking: {e}")

st.subheader(f"🗂️ Desafios já feitos por {usuario}")

try:
    cursor.execute("""
        SELECT DISTINCT d.id, d.titulo
        FROM desafios d
        JOIN ranking r ON d.id = r.desafio_id
        WHERE r.usuario = %s
        ORDER BY d.id
    """, (usuario,))
    feitos_data = cursor.fetchall()

    if feitos_data:
        df_feitos = pd.DataFrame(feitos_data, columns=["ID", "Título"])
        st.dataframe(df_feitos)
    else:
        st.info("Você ainda não resolveu nenhum desafio.")
except Exception as e:
    st.error(f"Erro ao carregar desafios feitos: {e}")