from google.cloud import bigquery

def create_bigquery_client():
    return bigquery.Client()

def get_table_schema():
    return {
        'fields': [
            {'name': 'nom_station', 'type': 'STRING', 'mode': 'NULLABLE'},
            {'name': 'available_bikes', 'type': 'INTEGER', 'mode': 'NULLABLE'},
            {'name': 'retrieval_time', 'type': 'TIMESTAMP', 'mode': 'NULLABLE'},
        ]
    }

