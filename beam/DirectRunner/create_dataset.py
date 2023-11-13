from google.cloud import bigquery
from google.cloud.exceptions import NotFound
from bigquery import create_bigquery_client, get_table_schema

def create_dataset_and_table(dataset_id, table_id):
    client = create_bigquery_client()

    # Create Dataset if it doesn't exist
    try:
        client.get_dataset(dataset_id)
        print(f"Dataset {dataset_id} already exists.")
    except NotFound:
        dataset = bigquery.Dataset(dataset_id)
        dataset.location = "europe-west9"
        client.create_dataset(dataset, timeout=30)
        print(f"Created dataset {dataset_id}")

    # Create Table if it doesn't exist
    try:
        client.get_table(table_id)
        print(f"Table {table_id} already exists.")
    except NotFound:
        # Correct the construction of SchemaField objects
        schema_fields = [bigquery.SchemaField(field['name'], field['type'], mode=field['mode'])
                         for field in get_table_schema()['fields']]
        table = bigquery.Table(table_id, schema=schema_fields)
        client.create_table(table, timeout=30)
        print(f"Created table {table_id}")
