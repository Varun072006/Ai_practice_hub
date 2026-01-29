-- Update Data Science Course Content
-- Setting up 4 specific levels as requested by the user

-- 1. Update Course details
UPDATE courses 
SET total_levels = 4, 
    description = 'Master Data Science: From loading and cleaning to transformation and statistics.' 
WHERE id = '550e8400-e29b-41d4-a716-446655440004';

-- 2. Insert/Update Data Science Levels

-- Level 1: Data Loading and Exploration
INSERT INTO levels (id, course_id, level_number, title, description, topic_description, learning_materials, code_snippet) VALUES
('660e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440004', 1, 
 'Foundations of Data Access and Exploration', 
 'Loading data from diverse sources for analysis',
 'Reading CSV, Excel, JSON files using Pandas; Handling delimiters, missing, and special values; Web scraping and reading data from URLs; Working with nested and multi-sheet datasets.',
 '{
    "introduction": "Learn how to load data from various sources effectively using Pandas and other tools.",
    "concepts": [
        {"title": "Data Loading", "explanation": "Reading data from CSV, Excel, JSON, and URLs."},
        {"title": "Data Exploration", "explanation": "Understanding the structure and content of your dataset."}
    ],
    "key_terms": ["CSV", "JSON", "Pandas", "Web Scraping"],
    "resources": [
        {"title": "Pandas Official Documentation", "url": "https://pandas.pydata.org/docs/"},
        {"title": "W3Schools – Pandas Tutorial", "url": "https://www.w3schools.com/python/pandas/"},
        {"title": "Real Python – Pandas Input/Output", "url": "https://realpython.com/pandas-read-write-files/"},
        {"title": "Corey Schafer – Pandas CSV, Excel, JSON (Video)", "url": "https://www.youtube.com/watch?v=vmEHCJofslg"},
        {"title": "Krish Naik – Reading Data from Multiple Sources (Video)", "url": "https://www.youtube.com/watch?v=txMdrV1Ut64"},
        {"title": "freeCodeCamp – Pandas Full Course (Video)", "url": "https://www.youtube.com/watch?v=vmEHCJofslg"}
    ]
 }',
 'import pandas as pd\n\n# Reading a CSV file\ndf = pd.read_csv("data.csv")\nprint(df.head())'
)
ON DUPLICATE KEY UPDATE 
    title=VALUES(title), 
    description=VALUES(description), 
    topic_description=VALUES(topic_description),
    learning_materials=VALUES(learning_materials),
    code_snippet=VALUES(code_snippet);

-- Level 2: Data Cleaning
INSERT INTO levels (id, course_id, level_number, title, description, topic_description, learning_materials, code_snippet) VALUES
('660e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440004', 2, 
 'Preparing Raw Data for Reliable Analysis', 
 'Fixing inconsistencies, errors, and data anomalies',
 'Handling missing values (drop, fill, interpolate); Identifying and removing duplicate records; Detecting and treating outliers (IQR, Z-Score); Visualizing data quality issues.',
 '{
    "introduction": "Clean data is crucial for accurate analysis. Learn techniques to handle missing values, duplicates, and outliers.",
    "concepts": [
        {"title": "Missing Values", "explanation": "Strategies to drop or fill missing data points."},
        {"title": "Outliers", "explanation": "Detecting extreme values using IQR or Z-Score."}
    ],
    "key_terms": ["Imputation", "Duplicates", "Outliers", "IQR", "Z-Score"],
    "resources": [
        {"title": "Pandas Missing Data Guide", "url": "https://pandas.pydata.org/docs/user_guide/missing_data.html"},
        {"title": "Kaggle – Data Cleaning Course", "url": "https://www.kaggle.com/learn/data-cleaning"},
        {"title": "Towards Data Science – Data Cleaning Articles", "url": "https://towardsdatascience.com/tagged/data-cleaning"},
        {"title": "Krish Naik – Data Cleaning Techniques (Video)", "url": "https://www.youtube.com/watch?v=4Rj8K3oP9Q0"},
        {"title": "Corey Schafer – Handling Missing Data (Video)", "url": "https://www.youtube.com/watch?v=ZyhVh-qRZPA"},
        {"title": "StatQuest – Outliers and IQR (Video)", "url": "https://www.youtube.com/watch?v=Q3bG3cJ7nJ0"}
    ]
 }',
 '# Handling missing values\ndf.dropna(inplace=True)\n# or\ndf.fillna(0, inplace=True)'
)
ON DUPLICATE KEY UPDATE 
    title=VALUES(title), 
    description=VALUES(description), 
    topic_description=VALUES(topic_description),
    learning_materials=VALUES(learning_materials),
    code_snippet=VALUES(code_snippet);

-- Level 3: Data Transformation
INSERT INTO levels (id, course_id, level_number, title, description, topic_description, learning_materials, code_snippet) VALUES
('660e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440004', 3, 
 'Transforming Data for Machine Learning Readiness', 
 'Converting data into model-friendly numerical formats',
 'Encoding categorical variables; Normalization and scaling techniques; Power and log transformations; Feature distribution adjustment and balancing.',
 '{
    "introduction": "Transform your data to make it suitable for machine learning models.",
    "concepts": [
        {"title": "Encoding", "explanation": "Converting categorical text data into numbers."},
        {"title": "Scaling", "explanation": "Standardizing the range of independent variables."}
    ],
    "key_terms": ["Encoding", "Normalization", "Standardization", "Scaling"],
    "resources": [
        {"title": "Scikit-Learn Preprocessing Documentation", "url": "https://scikit-learn.org/stable/modules/preprocessing.html"},
        {"title": "Kaggle – Feature Engineering Course", "url": "https://www.kaggle.com/learn/feature-engineering"},
        {"title": "Analytics Vidhya – Encoding & Scaling", "url": "https://www.analyticsvidhya.com/"},
        {"title": "Krish Naik – Encoding and Scaling Explained (Video)", "url": "https://www.youtube.com/watch?v=Gdz0wYcE9L4"},
        {"title": "StatQuest – Standardization vs Normalization (Video)", "url": "https://www.youtube.com/watch?v=mnKm3YP56PY"},
        {"title": "freeCodeCamp – Feature Engineering (Video)", "url": "https://www.youtube.com/watch?v=H1kB1i5m3Qs"}
    ]
 }',
 'from sklearn.preprocessing import StandardScaler\nscaler = StandardScaler()\nscaled_data = scaler.fit_transform(data)'
)
ON DUPLICATE KEY UPDATE 
    title=VALUES(title), 
    description=VALUES(description), 
    topic_description=VALUES(topic_description),
    learning_materials=VALUES(learning_materials),
    code_snippet=VALUES(code_snippet);

-- Level 4: Descriptive Statistics
INSERT INTO levels (id, course_id, level_number, title, description, topic_description, learning_materials, code_snippet) VALUES
('660e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440004', 4, 
 'Summarizing and Interpreting Data Characteristics', 
 'Understanding patterns, spread, and relationships in data',
 'Measures of central tendency; Measures of dispersion and variability; Correlation and association analysis; Statistical summaries and grouped insights.',
 '{
    "introduction": "Use descriptive statistics to summarize and understand your data''s main characteristics.",
    "concepts": [
        {"title": "Central Tendency", "explanation": "Mean, Median, Mode."},
        {"title": "Dispersion", "explanation": "Range, Variance, Standard Deviation."}
    ],
    "key_terms": ["Mean", "Median", "Mode", "Variance", "Correlation"],
    "resources": [
        {"title": "OpenIntro Statistics (Free Textbook)", "url": "https://www.openintro.org/book/os/"},
        {"title": "Khan Academy – Statistics & Probability", "url": "https://www.khanacademy.org/math/statistics-probability"},
        {"title": "Pandas Describe & GroupBy Docs", "url": "https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.describe.html"},
        {"title": "StatQuest – Statistics Fundamentals (Video)", "url": "https://www.youtube.com/watch?v=SzZ6GpcfoQY"},
        {"title": "Khan Academy – Descriptive Statistics (Video)", "url": "https://www.youtube.com/watch?v=Vfo5le26IhY"},
        {"title": "Corey Schafer – Pandas GroupBy & Describe (Video)", "url": "https://www.youtube.com/watch?v=UB3DE5Bgfx4"}
    ]
 }',
 'print(df.describe())\nprint(df.corr())'
)
ON DUPLICATE KEY UPDATE 
    title=VALUES(title), 
    description=VALUES(description), 
    topic_description=VALUES(topic_description),
    learning_materials=VALUES(learning_materials),
    code_snippet=VALUES(code_snippet);

SELECT 'Data Science course levels updated successfully!' as status;
