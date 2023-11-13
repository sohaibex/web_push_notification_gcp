import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.io import ReadFromText
from apache_beam.io.gcp.bigquery import WriteToBigQuery
from bigquery import get_table_schema
from create_dataset import create_dataset_and_table
import json
import re
from functools import partial

# Define your pipeline options
pipeline_options = PipelineOptions(
    runner='DataflowRunner',
    project='notification-app-402119',
    temp_location='gs://stationsinfo_velib/temp',
    region='europe-west9'
)

# Define GCS path for JSON files
gcs_bucket_path = "gs://stationsinfo_velib/data-2023-10-16T12:20:02.132Z.json"

# Extract the retrieval time from the bucket path
def extract_retrieval_time(path):
    match = re.search(r'data-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)', path)
    if match:
        return match.group(1)
    return None

retrieval_time = extract_retrieval_time(gcs_bucket_path)

# Transform function with retrieval_time as an additional parameter
def transform_data(element, retrieval_time):
    return {
        'nom_station': element['name'],
        'available_bikes': element['available_bikes'],
        'retrieval_time': retrieval_time
    }

# Create dataset and table
project_id = "notification-app-402119"
dataset_name = "velib_dataset"
table_name = "stations"
dataset_id = f"{project_id}.{dataset_name}"
table_id = f"{dataset_id}.{table_name}"
create_dataset_and_table(dataset_id, table_id)

# Apache Beam Pipeline
def run():
    with beam.Pipeline(options=pipeline_options) as p:
        (
            p
            | 'ReadFromGCS' >> ReadFromText(gcs_bucket_path)
            | 'ParseJSON' >> beam.Map(json.loads)
            | 'FlattenList' >> beam.FlatMap(lambda x: x)
            | 'TransformData' >> beam.Map(partial(transform_data, retrieval_time=retrieval_time))
            | 'WriteToBigQuery' >> WriteToBigQuery(
                f'{project_id}:{dataset_name}.{table_name}',
                schema=get_table_schema(),
                create_disposition=beam.io.BigQueryDisposition.CREATE_IF_NEEDED,
                write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND
            )
        )

if __name__ == '__main__':
    run()
