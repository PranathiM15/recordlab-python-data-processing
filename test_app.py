"""Small standard-library test suite: run `python -m unittest -v`."""
import unittest

from app import DataProcessingError, analyze_records, parse_records, process_upload


class RecordLabTests(unittest.TestCase):
    def test_parses_csv_with_quoted_comma(self):
        rows = parse_records('people.csv', 'name,city,score\n"Asha, R",Bengaluru,90\nRavi,Chennai,80\n')
        self.assertEqual(rows[0]['name'], 'Asha, R')
        self.assertEqual(len(rows), 2)

    def test_parses_json_records_wrapper(self):
        rows = parse_records('data.json', '{"records":[{"score":10},{"score":20}]}')
        self.assertEqual(rows, [{'score': 10}, {'score': 20}])

    def test_summary_statistics_and_missing_values(self):
        result = process_upload('scores.json', '[{"score":10,"group":"A"},{"score":20,"group":"A"},{"score":null,"group":"B"}]')
        score = next(field for field in result['field_stats'] if field['name'] == 'score')
        self.assertEqual(result['processed_rows'], 3)
        self.assertEqual(result['missing_total'], 1)
        self.assertEqual(score['min'], 10)
        self.assertEqual(score['max'], 20)
        self.assertEqual(score['mean'], 15)
        self.assertEqual(score['median'], 15)

    def test_detects_duplicate_rows(self):
        result = analyze_records([{'x': 1}, {'x': 1}, {'x': 2}])
        self.assertEqual(result['duplicate_rows'], 1)

    def test_rejects_empty_input(self):
        with self.assertRaises(DataProcessingError):
            parse_records('empty.csv', '   ')

    def test_rejects_json_scalars(self):
        with self.assertRaises(DataProcessingError):
            parse_records('wrong.json', '[1, 2, 3]')


if __name__ == '__main__':
    unittest.main(verbosity=2)
