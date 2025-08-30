import pandas as pd

df = pd.read_csv("df_combined.csv")

def calculate_revenue(row, violation_threshold=3):
    likes = row['diggCount']
    comments = row['commentCount']
    shares = row['shareCount']
    followers = row['authorMeta.fans']
    views = row['playCount']
    duration = row['videoMeta.duration']
    violations = row.get('violations', 0)

    if followers < 10000 or duration < 30 or (violation_threshold is not None and violations > violation_threshold):
        return 0

    reward_points = 0.6 * (views ** 0.5) + 0.4 * ((likes + comments + shares) / followers) * 1000

    # Scale to TikTok-like dollars
    revenue = reward_points * 0.0467
    
    return revenue

df['revenue'] = df.apply(lambda row: calculate_revenue(row, violation_threshold=3), axis=1)

df.to_csv("df_combined_with_revenue.csv", index=False)
print(df[['diggCount', 'commentCount', 'shareCount', 'authorMeta.fans', 'playCount', 'videoMeta.duration', 'revenue']].head())
